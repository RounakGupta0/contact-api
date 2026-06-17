# Contact Management REST API

A clean and professional RESTful API for managing contacts built with Node.js, Express, and MongoDB (Atlas).

## Features
- Full CRUD operations for contacts (Create, Read, Update, Delete).
- Case-insensitive search filter by Name, Email, or Phone.
- Robust request validation (valid email format, unique email, required fields).
- Consolidated, simple single-file entry architecture (`server.js`).

## Database Schema Fields
- `name` (String, required)
- `email` (String, required, unique, validated email format)
- `phone` (String, required)
- `gender` (String, enum: `['Male', 'Female', 'Other', 'Prefer not to say']`, default: `'Prefer not to say'`)
- `address` (String, optional)
- `createdAt` & `updatedAt` (auto-generated timestamps)

---

## Installation & Setup

1. **Clone or Navigate to the Directory**:
   ```bash
   cd "c:/antigravity test/contact-api"
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and configure your MongoDB connection string:
   ```env
   PORT=3000
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/contact_db?retryWrites=true&w=majority
   ```

4. **Run the Application**:
   - For Development (with live-reload via `nodemon`):
     ```bash
     npm run dev
     ```
   - For Production:
     ```bash
     npm start
     ```

---

## API Endpoints Documentation

### 1. Root / Welcome
- **URL**: `GET /`
- **Response**:
  ```json
  {
    "success": true,
    "message": "Welcome to the Contact Management REST API. Use /api/contacts for CRUD operations."
  }
  ```

### 2. Create a Contact
- **URL**: `POST /api/contacts`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "gender": "Male",
    "address": "123 Main St, New York, NY"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "648c8b4f1725528c11e389e0",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "gender": "Male",
      "address": "123 Main St, New York, NY",
      "createdAt": "2026-06-16T13:10:00.000Z",
      "updatedAt": "2026-06-16T13:10:00.000Z",
      "__v": 0
    }
  }
  ```

### 3. Get All Contacts (with Search)
- **URL**: `GET /api/contacts`
- **Query Parameters**: 
  - `search` (Optional) - Performs case-insensitive matching on `name`, `email`, or `phone`.
  - Example: `GET /api/contacts?search=john`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "_id": "648c8b4f1725528c11e389e0",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "+1234567890",
        "gender": "Male",
        "address": "123 Main St, New York, NY",
        "createdAt": "2026-06-16T13:10:00.000Z",
        "updatedAt": "2026-06-16T13:10:00.000Z",
        "__v": 0
      }
    ]
  }
  ```

### 4. Get a Single Contact
- **URL**: `GET /api/contacts/:id`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "648c8b4f1725528c11e389e0",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "gender": "Male",
      "address": "123 Main St, New York, NY",
      "createdAt": "2026-06-16T13:10:00.000Z",
      "updatedAt": "2026-06-16T13:10:00.000Z",
      "__v": 0
    }
  }
  ```

### 5. Update a Contact
- **URL**: `PUT /api/contacts/:id`
- **Headers**: `Content-Type: application/json`
- **Body** (Only specify fields to update):
  ```json
  {
    "phone": "+9876543210",
    "address": "456 Oak Ave, Boston, MA"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "648c8b4f1725528c11e389e0",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+9876543210",
      "gender": "Male",
      "address": "456 Oak Ave, Boston, MA",
      "createdAt": "2026-06-16T13:10:00.000Z",
      "updatedAt": "2026-06-16T13:15:00.000Z",
      "__v": 0
    }
  }
  ```

### 6. Delete a Contact
- **URL**: `DELETE /api/contacts/:id`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Contact deleted successfully"
  }
  ```
