from __future__ import annotations

import time
import urllib.parse
import re
from typing import List, Dict

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
import os

# ------------------------------------------------------
# DRIVER
# ------------------------------------------------------
def _build_driver(headless: bool = True) -> webdriver.Chrome:
    """Inicializa Chrome/Chromium WebDriver, funcionando tanto en local como en Docker."""
    options = Options()
    if headless:
        options.add_argument("--headless=new")

    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1280,800")

    # Si estamos en Docker, usamos el binario y driver del sistema
    in_docker = os.getenv("IN_DOCKER") == "1"

    chrome_bin = os.getenv("CHROME_BIN")
    if chrome_bin:
        options.binary_location = chrome_bin  # ej: /usr/bin/chromium en Docker

    if in_docker:
        # En Docker, usamos el chromedriver instalado por apt
        service = Service("/usr/bin/chromedriver")
    else:
        # En tu máquina local, dejamos que webdriver_manager se encargue
        service = Service(ChromeDriverManager().install())

    driver = webdriver.Chrome(service=service, options=options)
    return driver



# ------------------------------------------------------
# URL de búsqueda
# ------------------------------------------------------
def _search_url(query: str) -> str:
    encoded = urllib.parse.quote(query)
    return f"https://www.google.com/maps/search/{encoded}"


# ------------------------------------------------------
# Extraer datos desde una card (vista de resultados)
# ------------------------------------------------------
def _extract_place_from_card(card, query: str) -> Dict:
    """Extrae datos desde una card del listado principal."""
    # Nombre del local
    try:
        name_el = card.find_element(By.CSS_SELECTOR, "a.hfpxzc")
        name = name_el.get_attribute("aria-label") or name_el.text
    except:
        name = ""

    # URL del local (vista detallada)
    try:
        place_url = card.find_element(By.CSS_SELECTOR, "a.hfpxzc").get_attribute("href")
    except:
        place_url = None

    # Rating y cantidad de reviews
    average_rating = None
    try:
        rating_el = card.find_element(By.CSS_SELECTOR, "span.ZkP5Je")
        aria = rating_el.get_attribute("aria-label")  # Ej: "4.5 estrellas 1,791 opiniones"

        # rating
        rating_match = re.search(r"([\d,\.]+)", aria)
        if rating_match:
            average_rating = float(rating_match.group(1).replace(",", "."))

        # reviews (dentro de paréntesis)
        reviews_match = re.search(r"\(([\d\.,]+)\)", aria)
        if reviews_match:
            count_str = reviews_match.group(1).replace(".", "").replace(",", "")
    except:
        pass

    # Imagen previa (thumbnail)
    try:
        img_url = card.find_element(By.CSS_SELECTOR, "img").get_attribute("src")
    except:
        img_url = None

    # Dirección básica (texto en línea con categoría)
    address = ""
    try:
        rows = card.find_elements(By.CSS_SELECTOR, "div.W4Efsd")
        if rows:
            text = rows[0].text  # Ej: "Cafetería · San Lorenzo 348"
            parts = [p.strip() for p in text.split("·")]
            if len(parts) > 1:
                address = parts[-1]  # Tomamos la parte que parece dirección
            else:
                address = text
    except:
        pass

    return {
        "query": query,
        "name": name,
        "average_rating": average_rating,
        "address": address,  # DE MOMENTO incompleta
        "url": place_url,    # ESTA URL SÍ sirve
        "phone": None,
        "website": None,
        "image": img_url,
}

def _extract_details_from_place_page(driver):
    """Scrapea teléfono, website y dirección precisa en la vista de un lugar."""
    phone = None
    website = None
    address = None

    # Teléfono
    try:
        el = driver.find_element(By.CSS_SELECTOR, 'a[href^="tel:"]')
        phone = el.get_attribute("href").replace("tel:", "")
    except:
        pass

    # Website
    try:
        el = driver.find_element(By.CSS_SELECTOR, 'a[data-item-id="authority"]')
        website = el.get_attribute("href")
    except:
        pass

    # Dirección precisa
    try:
        el = driver.find_element(By.CSS_SELECTOR, 'button[data-item-id="address"]')
        raw = el.text.strip()
        # suele venir "\nIrigoyen 2500, M5513 Maipú, Mendoza"
        address = raw.split("\n")[-1].strip()
    except:
        pass

    return {
        "phone": phone,
        "website": website,
        "address": address,
    }


# ------------------------------------------------------
# Esperar carga inicial del listado
# ------------------------------------------------------
def _wait_results_loaded(driver):
    """Espera básica para que carguen las cards del listado."""
    for _ in range(20):
        cards = driver.find_elements(By.CSS_SELECTOR, "div[role='article']")
        if cards:
            return
        time.sleep(0.3)
        
def _collect_cards(driver, max_cards: int = 20, max_scrolls: int = 15):
    """
    Hace scroll en el panel de resultados de Maps hasta conseguir
    hasta max_cards cards o quedarse sin nuevos resultados.
    """
    cards = []
    last_len = 0
    scrolls = 0

    while scrolls < max_scrolls:
        cards = driver.find_elements(By.CSS_SELECTOR, 'div[role="article"]')
        if len(cards) >= max_cards:
            break

        # si no siguen apareciendo nuevas cards, cortamos
        if len(cards) == last_len:
            scrolls += 1
        else:
            scrolls = 0  # reset si sí aparecieron nuevas
            last_len = len(cards)

        if cards:
            try:
                # scrolleo hacia la última card encontrada
                driver.execute_script("arguments[0].scrollIntoView();", cards[-1])
            except Exception:
                pass

        time.sleep(1.0)

    return cards[:max_cards]


# ------------------------------------------------------
# Scraping principal
# ------------------------------------------------------
def scrape_google_maps(queries: List[str], max_per_query: int = 20) -> List[Dict]:
    """Procesa múltiples búsquedas en Google Maps y extrae datos completos."""
    driver = _build_driver(headless=True)
    all_results: List[Dict] = []

    try:
        for q in queries:
            url = _search_url(q)
            driver.get(url)
            _wait_results_loaded(driver)

            # 👉 ahora usamos scroll para conseguir más cards
            cards = _collect_cards(driver, max_cards=max_per_query)

            # 1) leer info básica de la lista
            base_places: List[Dict] = []
            for card in cards:
                place = _extract_place_from_card(card, q)
                base_places.append(place)

            # 2) completar info con la ficha detallada
            for place in base_places:
                place_url = place.get("url")
                if place_url:
                    try:
                        driver.get(place_url)
                        time.sleep(2)
                        details = _extract_details_from_place_page(driver)
                        place.update(details)
                    except Exception as e:
                        print(f"[WARN] Error obteniendo detalles: {e}")

                # opcional: filtrar lugares vacíos
                if place.get("name"):
                    all_results.append(place)

    finally:
        driver.quit()

    return all_results



