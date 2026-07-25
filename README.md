# PaperLeak

An interactive static dashboard for exploring reported Indian exam paper leak incidents from 2004 to 2026.

Live site: https://jisan09.github.io/PaperLeak/

## What It Shows

- Yearwise incident trends
- Statewise counts on an India map
- State and territory rankings
- Leak status breakdown
- Conducting body, body type, confidence, and action-taken views
- Aspirants affected and arrests summaries
- Filterable incident records table with source links

The dashboard supports click-to-filter interactions across charts and works as a static GitHub Pages site.

## Data Source

Dataset credit:

**India Paper Leaks from 2004 to 2026** by Sujay Nadkarni on Kaggle  
https://www.kaggle.com/datasets/sujaynadkarni/india-paper-leaks-from-2004-to-2026/data

The CSV used in this project is stored at:

```text
data/paper_leaks.csv
```

## Run Locally

Because the app loads the CSV with `fetch`, run it from a local server:

```bash
python3 -m http.server 5173
```

Then open:

```text
http://127.0.0.1:5173/
```

## Tech

- HTML
- CSS
- Vanilla JavaScript
- Google GeoChart for the India map

## Notes

This project is for data exploration and visualization. Incident counts, source confidence, arrests, affected aspirants, and other fields depend on the source dataset and should be interpreted with the dataset notes and linked sources.
