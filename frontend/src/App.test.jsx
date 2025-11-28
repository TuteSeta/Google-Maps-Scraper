import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";

global.fetch = vi.fn();

beforeEach(() => {
  fetch.mockReset();
});


test("renderiza el título principal", () => {
  render(<App />);
  expect(screen.getByText("Google Maps Scraper")).toBeInTheDocument();
});


test("muestra error si se envía el formulario vacío", async () => {
  render(<App />);

  const btn = screen.getByText("Scrapear");
  fireEvent.click(btn);

  expect(
    screen.getByText("Por favor escribí una búsqueda (ej: cafeterías en Mendoza).")
  ).toBeInTheDocument();
});


test("muestra loading mientras se buscan datos", async () => {
  // Fetch queda esperando hasta que el test decida resolverlo
  fetch.mockImplementation(() => new Promise(() => {}));

  render(<App />);

  fireEvent.change(screen.getByLabelText("Búsqueda"), {
    target: { value: "cafeterías" },
  });

  fireEvent.click(screen.getByText("Scrapear"));

  expect(screen.getByText("Buscando...")).toBeInTheDocument();
});


test("renderiza resultados cuando el backend responde", async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      job_id: "abc123",
      results: [
        {
          name: "Café Test 1",
          average_rating: 4.5,
          address: "Calle Falsa 123",
          url: "https://maps.test/1",
          phone: "+54 9 261 1234567",
        },
      ],
    }),
  });

  render(<App />);

  fireEvent.change(screen.getByLabelText("Búsqueda"), {
    target: { value: "cafeterías" },
  });

  fireEvent.click(screen.getByText("Scrapear"));

  expect(fetch).toHaveBeenCalledWith(
    "http://localhost:5000/scrape",
    expect.any(Object)
  );

  expect(await screen.findByText("Café Test 1")).toBeInTheDocument();
  expect(screen.getByText("⭐ 4.5")).toBeInTheDocument();
});


test("muestra mensaje de error si el servidor responde con error", async () => {
  fetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({
      error: "Error del servidor",
    }),
  });

  render(<App />);

  fireEvent.change(screen.getByLabelText("Búsqueda"), {
    target: { value: "cafeterías" },
  });

  fireEvent.click(screen.getByText("Scrapear"));

  expect(await screen.findByText("Error del servidor")).toBeInTheDocument();
});
