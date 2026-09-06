# AUA Members Directory

A geo-search directory for the [Animal Ultrasound Association](https://animalultrasoundassociation.org)
— members of the public enter a UK postcode and get the nearest accredited
veterinary ultrasound scanners, ranked by distance and plotted on a map.

**Live:** https://aua-members-directory.vercel.app

## What it does

- **Postcode / location search** with geocoding, defaulting to the visitor's
  detected location.
- **Distance-ranked results** — each member card shows the practice, the
  practitioner, contact details and how far away they are.
- **Interactive Leaflet map** with a pin per member, synced to the result list.
- **Member profiles** for each listing.

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · Leaflet

## Running locally

```bash
npm install
npm run dev          # http://localhost:5173
```

```bash
npm run build && npm run preview
```
