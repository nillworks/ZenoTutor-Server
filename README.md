<p align="center">
  <img src="https://img.shields.io/badge/Express.js-5-000000?style=for-the-badge&logo=express" />
  <img src="https://img.shields.io/badge/MongoDB-7-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white" />
</p>

# MediQueue Backend

This is the backend server for the MediQueue tutor booking platform. It provides a REST API for managing tutors, bookings, and authentication using JWT.

---

## Tech Stack

* Node.js
* Express.js
* MongoDB
* jose-cjs (JWT verification)
* dotenv
* cors

---

## API Endpoints

### Public Routes

* `GET /tutors`
  Get all tutors with optional search and date filtering

* `GET /topTutors`
  Get top 6 tutors

---

### Private Routes (JWT Required)

* `GET /tutors/:id`
  Get single tutor details

* `POST /tutors`
  Create a new tutor

* `PATCH /tutors/:id`
  Update tutor data

* `DELETE /tutors/:id`
  Delete tutor

* `GET /tutorsList/:id`
  Get tutors by user account

* `GET /myBooking/:id`
  Get user bookings

* `POST /myBooking`
  Create booking and decrease slot

* `PATCH /myBooking/:id`
  Cancel booking

---

## Database

### Collections

* `tutorsData`
* `my-booking-data`

### CRUD Operations

* Create → `insertOne()`
* Read → `find()`, `findOne()`
* Update → `updateOne()`
* Delete → `deleteOne()`

---

## JWT Authentication

* Token is sent from client using Authorization header

```
Authorization: Bearer <token>
```

* Backend verifies token using JWKS

```javascript
const jwks = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) return res.status(401).send({ message: 'Unauthorized' });

  const token = authHeader.split(' ')[1];
  await jwtVerify(token, jwks);

  next();
};
```

* Invalid token returns 403

---

## Booking Logic

When a booking is created:

1. Insert booking data
2. Decrease tutor slot

```javascript
await myBookingDataCollection.insertOne(newBooking);

await tutorsDataCollection.updateOne(
  { _id: new ObjectId(tutorId) },
  { $inc: { slots: -1 } }
);
```

---

## Search and Filter

### Search

* Uses MongoDB `$regex`

### Date Filter

```javascript
if (startDate || endDate) {
  query.sessionStartDate = {};

  if (startDate) {
    query.sessionStartDate.$gte = startDate;
  }

  if (endDate) {
    query.sessionStartDate.$lte = endDate;
  }
}
```

---

## Security

* JWT protected routes using middleware
* Authorization header validation
* Prevent invalid ObjectId crash using null checks

---

## Error Handling

* Handles missing `tutorId`
* Prevents server crash on invalid requests
* Returns proper response for unauthorized access

---

## Project Structure

```
backend/
├── index.js
├── package.json
├── vercel.json
├── .env
```

---

* Deployed on Vercel (serverless)
* MongoDB Atlas used as database

---
