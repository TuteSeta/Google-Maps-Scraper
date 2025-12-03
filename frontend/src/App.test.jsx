import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

global.fetch = vi.fn();

beforeEach(() => {
  fetch.mockReset();
});

const renderApp = (route = "/scraper") => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>
  );
};

test("renderiza el título principal", () => {
  renderApp("/"); 

  expect(screen.getByText("Google Maps Scraper")).toBeInTheDocument();
});

test("muestra error si se envía el formulario vacío", async () => {
  renderApp("/scraper");

  const btn = screen.getByText("Scrapear");
  fireEvent.click(btn);

  expect(
    screen.getByText(
      "Por favor escribí una búsqueda (ej: cafeterías en Mendoza)."
    )
  ).toBeInTheDocument();
});

test("muestra loading mientras se buscan datos", async () => {
  // Fetch queda pendiente hasta que el test lo resuelva
  fetch.mockImplementation(() => new Promise(() => {}));

  renderApp("/scraper");

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

  renderApp("/scraper");

  fireEvent.change(screen.getByLabelText("Búsqueda"), {
    target: { value: "cafeterías" },
  });

  fireEvent.click(screen.getByText("Scrapear"));

  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining("/scrape"),
    expect.objectContaining({
      method: "POST",
    })
  );

  expect(await screen.findByText("Café Test 1")).toBeInTheDocument();
  expect(screen.getByText("⭐ 4.5")).toBeInTheDocument();
});

test("muestra mensaje de error si el servidor responde con error", async () => {
  fetch.mockResolvedValueOnce({
    ok: false,
    status: 500,
    json: async () => ({ error: "Error del servidor" }),
    text: async () => "Error del servidor",
  });

  renderApp("/scraper");

  fireEvent.change(screen.getByLabelText("Búsqueda"), {
    target: { value: "cafeterías" },
  });

  fireEvent.click(screen.getByText("Scrapear"));

  // Matcher más flexible por si el texto está envuelto en otros elementos
  const errorElement = await screen.findByText((content) =>
    content.includes("Error del servidor")
  );

  expect(errorElement).toBeInTheDocument();
});

