const API_BASE_URL = "http://localhost:5000";

async function handleResponse(resp) {
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `Error ${resp.status}`);
  }
  if (resp.status === 204) return null;
  return resp.json();
}

export async function fetchJobs() {
  const resp = await fetch(`${API_BASE_URL}/jobs`);
  return handleResponse(resp);
}

export async function fetchJobResults(jobId) {
  const resp = await fetch(`${API_BASE_URL}/jobs/${jobId}/results`);
  return handleResponse(resp);
}

export async function updatePlaceContacted(placeId, contacted) {
  const resp = await fetch(`${API_BASE_URL}/places/${placeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contacted }),
  });
  return handleResponse(resp);
}

export function downloadResultsAsCSV(results, filename = "resultados.csv") {
  if (!results || results.length === 0) return;
  const headers = Object.keys(results[0]);
  const csvRows = [];
  csvRows.push(headers.join(","));

  results.forEach((row) => {
    const values = headers.map((key) => {
      const value = row[key] == null ? "" : String(row[key]);
      const escaped = value.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  });

  const blob = new Blob([csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
