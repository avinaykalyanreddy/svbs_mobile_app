# SVBS App — Project Context

This document is the starting point for developers and coding assistants working on this repository. Read it before changing behavior that spans the mobile app and backend.

## Product purpose

SVBS is a customer-facing financial-services app with a separate admin experience. Customers can view QR payment options, request Card to Cash service, see SVBS announcements, and chat with the admin team. Admins manage QR rates, bank-rate groups, bank names, advertisements, and customer conversations.

Service requests and payment proofs are currently sent to the admin through chat. The app does not process payments or perform payouts itself.

## Technology stack

### Mobile

- React Native with Expo SDK 57
- TypeScript and React 19
- Expo Router for file-based navigation
- React Native StyleSheet for UI styling
- Expo Image Picker and Expo File System for photo selection and uploads
- `@expo/vector-icons` (Ionicons) for icons
- React Native Reanimated and Expo Splash Screen for app presentation

### Backend

- Python and Django 6.1
- Django REST Framework for JSON APIs
- PostgreSQL via `psycopg`
- `django-cors-headers` for local web development
- Django migrations are under `backend/app/migrations/` and `backend/user/migrations/`

## Repository layout

```text
backend/
  app/                 Service, advertisement, chat, and notification models and APIs
  user/                Customer/admin user model and login API
  backend/             Django settings, root URL configuration, ASGI/WSGI
  manage.py
  requirements.txt
mobile/
  src/app/             Expo Router screens
  src/components/      Shared UI components
  src/constants/api.ts Backend API URLs
  src/lib/             Auth session and notification badge state
  app.json             Expo app configuration
  package.json
PROJECT_CONTEXT.md     This guide
```

## Main user flows

### Login and roles

- The mobile app submits an email address or mobile number and password to `POST /api/auth/login/`.
- The backend looks up the `Users` row and returns a signed bearer token plus the user's `role` (`admin` or `user`).
- The mobile app routes admins to the admin dashboard and regular users to the customer dashboard.
- The signup screen is a frontend prototype. Its Aadhaar, SMS OTP, and email OTP steps are not connected to a real registration, KYC, or OTP provider.

### Customer dashboard and advertisements

- `mobile/src/app/dashboard.tsx` fetches advertisements from `/api/ads/` and displays them in a swipeable, slowly auto-advancing carousel.
- Ads are ordered oldest to newest by the backend. Selecting a card opens its full title and content.
- Cards show a red `NEW` label when the backend-calculated `is_new` field is true (created within the last 24 hours). The card also displays its creation date and time.
- Advertisement cards are dashboard content, not bell notifications. The notification bell is for chat alerts.

### QR Payment

- QR names, images, MDR percentages, IMPS charges, and availability messages come from `QRPercentage` through `/api/qr/`.
- The customer enters an amount and account/contact details. The app calculates the fee summary and requires a payment screenshot.
- Submitting creates a chat message containing the payment details and uploaded screenshot for the admin. There is no separate payment-request or settlement model in the current backend.

### Card to Cash

- The customer sees admin-configured percentage groups and their assigned banks from `/api/card-percentages/`.
- A percentage group can include an IMPS charge and an availability message.
- The customer chooses Link or Manual, enters the request details, and selects the text-details or face-photo verification option shown by the UI.
- The request and any selected photos are sent as a chat message to the admin. This project does not process the payment link or payout.

### Admin

- Admin screens live in `mobile/src/app/admin/index.tsx`.
- Admins can add/delete QR entries, configure Card to Cash percentages and IMPS values, assign available bank names, and create/view/delete advertisement cards.
- The admin message icon opens the customer conversation list, including customers who have not sent a message yet.

### Customer/admin chat

- Customer and admin share a private support conversation per customer.
- Text and image messages are stored by the backend. The chat UI supports image previews, delivery/read state, and a typing indicator.
- Message list polling is used; this is not a WebSocket/realtime transport.
- Chat notifications are stored in `AppNotification`. The app polls the notification endpoint for the bell badge. Reading/opening a chat clears its related chat alerts; opening the bell marks chat alerts as read while retaining their history.
- Expo Notifications is listed in app configuration, but native push delivery and notification sounds are not currently active. Do not assume a push token or background alert flow exists.

## Backend models

- `user.Users`: customer/admin identity, unique email/mobile/Aadhaar, password hash, and role.
- `app.QRPercentage`: QR identifier/name, image URL, MDR percentage, IMPS charge, customer notice, creation time.
- `app.Percentage`: Card to Cash percentage (string primary key), IMPS charge, and customer availability message.
- `app.BankNames`: available bank names.
- `app.BankAndPercentage`: many-to-many assignment between bank names and percentage groups; deleting either parent cascades the assignment.
- `app.Ads`: advertisement title, content, and creation timestamp.
- `app.ChatConversation`: one support conversation per customer.
- `app.ChatMessage`: text, optional chat/verification images, sender, timestamps, and delivery/read flags.
- `app.ChatTypingStatus`: short-lived typing state per conversation and user.
- `app.AppNotification`: durable in-app notification records; currently the bell feed/count is used for chat notifications.

## API map

All API paths below are relative to `/api/`.

| Path | Purpose |
| --- | --- |
| `POST auth/login/` | Login with email or phone and password |
| `GET/POST banks/` | List or create available bank names |
| `DELETE banks/{name}/` | Delete a bank name and its assignments |
| `GET/POST qr/` | List or create QR payment entries |
| `PATCH/DELETE qr/{id}/` | Update QR notice or delete a QR entry |
| `GET/POST ads/` | List or create dashboard ads |
| `GET/DELETE ads/{id}/` | View or delete an ad |
| `GET/POST card-percentages/` | List or create Card to Cash percentage groups |
| `PATCH/DELETE card-percentages/{percentage}/` | Update a group message/IMPS or delete a group |
| `POST card-percentages/{percentage}/banks/` | Assign a bank to a percentage group |
| `DELETE card-percentages/{percentage}/banks/{name}/` | Remove a bank assignment |
| `GET/POST chat/messages/` | Customer's chat message list or send message |
| `GET chat/conversations/` | Admin customer conversation list |
| `GET/POST chat/conversations/{id}/messages/` | Admin conversation list or send message |
| `GET/POST chat/typing/` | Customer typing status |
| `GET/POST chat/conversations/{id}/typing/` | Admin typing status |
| `GET/POST notifications/` | Read chat notifications / mark them read |

Authenticated chat, admin, and notification requests use `Authorization: Bearer <signed-login-token>`.

## Configuration and local development

### Backend

- Install dependencies from `backend/requirements.txt` in a Python virtual environment.
- Set `DJANGO_SECRET_KEY` to a private random value for any deployed environment. The in-code fallback is only for local development.
- `DJANGO_DEBUG` defaults to false. Set it to `true` only for local debugging.
- PostgreSQL settings can be supplied as `DJANGO_DB_NAME`, `DJANGO_DB_USER`, `DJANGO_DB_PASSWORD`, `DJANGO_DB_HOST`, and `DJANGO_DB_PORT`. Defaults target a local database named `svbs`.
- Run migrations with `python manage.py migrate`, then start the API with `python manage.py runserver 0.0.0.0:8000` from `backend/`.

### Mobile

- Install dependencies from `mobile/package.json` in `mobile/`.
- Set `EXPO_PUBLIC_API_URL` to the backend URL reachable by the device. Defaults are `http://10.0.2.2:8000/api` for Android emulator and `http://127.0.0.1:8000/api` for iOS simulator/web. A physical phone needs the development computer's LAN IP or another reachable backend URL.
- Start Expo with `npm start` from `mobile/`.
- Validation commands: `npx tsc --noEmit` and `npm run lint`.

## Data and privacy notes

- Never commit `.env` files, production secrets, database dumps, or uploaded media.
- `backend/media/` may contain customer chat/verification photos and QR images; it is intentionally excluded from Git. Configure appropriate private media storage for deployment.
- User inputs can include Aadhaar, bank, account, phone, and verification details. Avoid logging or copying those values into examples, test output, or documentation.
- This repository contains application code and migrations, not a database backup or production deployment configuration.

## Guidance for future coding assistants

1. Read `mobile/AGENTS.md` before changing Expo or React Native code.
2. Inspect both the mobile screen and the matching backend endpoint/model for cross-stack changes.
3. Preserve the existing `mobile/` and `backend/` separation.
4. Keep service requests flowing through chat unless the product owner explicitly asks for a dedicated request model/API.
5. Do not claim real SMS/email OTP, payment processing, payouts, push notifications, or background notification sound unless those integrations have been added and verified.
6. Keep private uploads and local environment configuration out of commits.
