# Secure DMS — SIH26190 (The Catalyst)

Secure Digital Document Management System for legal and investigation documents.

## Prerequisites

Docker and Docker Compose. (You no longer need to install Java, Maven, or Node manually—everything runs in containers!)

## Quick Start

### 1. Configure Environment Variables

Create a `.env` file from the example:
```bash
cp .env.example .env
```
Open the `.env` file and fill in real values for `JWT_SECRET`, `AES_KEY`, and `DB_PASSWORD`. 

> **Important:** `AES_KEY` must be a valid Base64 string that decodes to exactly 32 bytes (AES-256). `JWT_SECRET` should be a 64-byte Base64 string.

### 2. Run the Entire Stack

Use Docker Compose to build and start the PostgreSQL database, the Spring Boot API, and the React frontend.

```bash
docker compose --env-file .env up -d --build
```

### 3. Access the Application

Once the containers are built and running, you can access the following services:

* **Frontend App:** `http://localhost:5174`
* **Backend API:** `http://localhost:8081`
* **Database:** `localhost:5433` (username: `dms`)

---

## Copyright

© All copyrights are reserved to the owner and collaborators only. No other entity is permitted to use, modify, or distribute this code without explicit authorization.
