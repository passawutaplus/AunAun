# Product Memory

This document is the compact product memory for A+ Vault / A Vaultory. Use it as the decision filter before adding or changing features.

## Product Thesis

A Vaultory is a private creative reference vault for Thai freelance designers and small creative teams.

The problem is not a lack of storage. The real problem is that references are scattered across websites, Pinterest, Behance, downloads, mobile galleries, screenshots, folders, and chats. When a creative starts real work, they remember the visual but cannot find the object, source, or context.

The product promise:

```text
Save creative references from anywhere.
Preserve preview, source, and context.
Find and reuse them when they matter.
```

## Ecosystem Role

- Vault: capture and retrieve creative references.
- So1o: manage freelance work, briefs, clients, and documents.
- Aplus1: showcase portfolio, process, and opportunities.

Vault feeds the rest of the Aplus ecosystem. It is the starting point before a reference becomes a brief, project direction, case study, or portfolio story.

## Primary User

The first user is a Thai freelance designer or small creative team that:

- uses Pinterest, Behance, Google, websites, and social platforms for references
- saves inspiration in many places
- creates moodboards or visual direction for real jobs
- needs speed, taste, and trust more than a complex enterprise system
- may pay if the product saves time and keeps references usable

## Core Experience

The killer feature is the browser extension action:

```text
+ Keep in Vault
```

The preferred flow:

```text
See reference
Right click
+ Keep in Vault
Saved to Vault Library
Stay on the same page
Keep browsing
```

If the extension is unreliable, the product becomes a generic storage website. Extension reliability is therefore the entry point, not an add-on.

## Product Model

- Vault Library is the central source of truth. Every object is saved here first.
- Inbox is the default unsorted state.
- Collections are custom groupings by theme, material, client, campaign, or research topic.
- Moodboards are canvas workspaces that reuse existing Vault objects.
- Projects gather selected collections, moodboards, and object relations for one job.

Do not duplicate objects when they are used in collections, moodboards, or projects. Store relations to the original Vault object.

## Non-Negotiable Principles

1. Capture first. Make saving effortless before adding large work surfaces.
2. Private by default. Public sharing must be explicit.
3. Preserve context: preview, source URL, canonical URL, page title, domain, saved date, note, capture method, creator/author when possible, and project/collection relation.
4. Save now, organize later. Never force project or collection selection during quick save.
5. Never break browsing flow. Do not redirect the current tab after save by default.
6. Search is as important as capture. A vault that cannot retrieve is a graveyard.
7. Trust beats short-term conversion. Never delete user data to force payment.
8. Taste is product value. The UI must feel calm, premium, minimal, and designer-friendly.
9. Build in phases. Avoid large shiny features until capture and retrieval are proven.
10. Never expose service-role keys or AI secrets in the client or browser extension.

## Positioning

- Pinterest = discover
- Vault = keep from anywhere
- mymind = save what you want to remember
- Vault = save creative references you may use in future work
- Eagle = manage design assets
- Vault = capture references and preserve context
- Milanote = board-first
- Vault = library-first, board later

Vault must not become a generic bookmark manager, generic cloud drive, password manager, second brain for everything, full design editor, or public discovery feed.

## Current Priority

1. Reliable Smart Capture Pipeline
2. Behance, Pinterest, and portfolio site compatibility
3. Preview and thumbnail reliability
4. Stay on current page
5. Recently kept
6. Snapshot fallback
7. Source preservation
8. Search and filters
9. Collections
10. AI metadata schema preparation

## Success Metrics

Activation is not only installing the extension. A stronger activation definition is:

```text
Install extension
Save at least 10 references
Return to open or search at least 1 item within 7 days
```

North star:

```text
References reopened, searched, organized, shared, or reused per active user per month.
```

Technical metrics:

- capture success rate
- preview success rate
- save latency
- failed domains
- retry success rate
- metadata enrichment success

## Decision Filter

Before implementing any feature, answer:

- What user problem does it solve?
- What is the smallest useful version?
- What is out of scope?
- What metric should improve?
- What happens if the API or preview fails?
- Does it preserve source and context?
- Does it keep the product private by default?
- Does it improve capture, retrieval, or real work reuse?

When unsure, prioritize:

```text
Reliability
Speed
Clarity
Privacy
Searchability
Taste
```

