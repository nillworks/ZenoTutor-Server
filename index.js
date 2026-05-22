const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express();
const cors = require('cors');
const dotEnv = require('dotenv');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
const port = process.env.PORT || 8000;

dotEnv.config();
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.DB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const jwks = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);

// auth
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.split(' ')[1];

  if (!authHeader) {
    return res.status(401).json({ message: 'unauthorized' });
  }
  if (!token) {
    return res.status(401).json({ message: 'unauthorized' });
  }

  // verify token
  try {
    const { payload } = await jwtVerify(token, jwks);
    next();
  } catch (error) {
    return res.status(403).json({ massage: 'forbidden' });
  }
};

async function run() {
  try {
    // await client.connect();
    // await client.db('admin').command({ ping: 1 });

    const database = client.db('TutorsDataBase');
    const tutorsDataCollection = database.collection('tutorsData');
    const myBookingDataCollection = database.collection('my-booking-data');

    // all api
    app.get('/tutors', async (req, res) => {
      const search = req.query.search || '';
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;

      let query = {};

      // SEARCH
      if (search) {
        query.name = { $regex: search, $options: 'i' };
      }

      // DATE FILTER (STRING BASED FIX)
      if (startDate || endDate) {
        query.sessionStartDate = {};

        if (startDate) {
          query.sessionStartDate.$gte = startDate;
        }

        if (endDate) {
          query.sessionStartDate.$lte = endDate;
        }
      }

      const result = await tutorsDataCollection.find(query).toArray();

      res.send({
        message: 'successfully tutors data get',
        ok: true,
        tutors: result,
      });
    });

    // all api
    app.get('/tutorsList/:id', verifyToken, async (req, res) => {
      const userId = req.params.id;
      const query = {
        'accountInfo.id': userId,
      };
      const result = await tutorsDataCollection.find(query).toArray();
      res.send({
        massage: 'successfully tutorsList data get',
        ok: true,
        tutorsList: result,
      });
    });

    // post tutor api
    app.post('/tutors', verifyToken, async (req, res) => {
      const newTutors = req.body;
      const result = await tutorsDataCollection.insertOne(newTutors);
      res.send(result);
    });

    app.delete('/tutors/:id', verifyToken, async (req, res) => {
      const id = req.params.id;

      const query = {
        _id: new ObjectId(id),
      };

      const deleteTutorData = await tutorsDataCollection.deleteOne(query);

      res.send(deleteTutorData);
    });

    // Update Tutors Data
    app.patch('/tutors/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = {
        _id: new ObjectId(id),
      };

      const modifiedTutor = req.body;
      const updateDocument = {
        $set: {
          ...modifiedTutor,
        },
      };

      const result = await tutorsDataCollection.updateOne(
        filter,
        updateDocument,
      );

      res.send(result);
    });

    // limit Data AvailableTutors
    app.get('/topTutors', async (req, res) => {
      const cursor = tutorsDataCollection.find().limit(6);
      const result = await cursor.toArray();
      res.send({
        massage: 'successfully top tutors data get',
        ok: true,
        tutors: result,
      });
    });

    // single tutors Api
    app.get('/tutors/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const tutorsData = await tutorsDataCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(tutorsData);
    });

    // My booking Data get api
    app.get('/myBooking/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = {
        'accountInfo.id': id,
      };
      const cursor = myBookingDataCollection.find(query);
      const result = await cursor.toArray();
      res.send({
        massage: 'successfully myBooking data get',
        ok: true,
        myBooking: result,
      });
    });

    // My booking Data post api
    app.post('/myBooking', verifyToken, async (req, res) => {
      const newBooking = req.body;
      const tutorId = req.body.tutorId;
      const userId = req.body.accountInfo.id;
      const BookingStatus = req.body.BookingStatus === true;
      // const { tutorId, userEmail } = newBooking;

      // 1. check existing active booking
      const existingBooking = await myBookingDataCollection.findOne({
        tutorId: tutorId,
        'accountInfo.id': newBooking.accountInfo.id,
        BookingStatus: true,
      });

      if (existingBooking) {
        return res.status(400).send({
          message: 'You already booked this tutor',
          BookedAlready: true,
        });
      }

      // 2. check slots
      const tutor = await tutorsDataCollection.findOne({
        _id: new ObjectId(tutorId),
      });

      if (!tutor || tutor.slots <= 0) {
        return res.status(400).send({
          message: 'No slots available',
        });
      }

      // 3. insert booking
      const bookingResult = await myBookingDataCollection.insertOne({
        ...newBooking,
        BookingStatus: true, // MUST
      });

      // 4. decrease slot
      await tutorsDataCollection.updateOne(
        { _id: new ObjectId(tutorId) },
        { $inc: { slots: -1 } },
      );

      res.send({
        acknowledged: true,
        bookingId: bookingResult.insertedId,
      });
    });

    app.patch('/myBooking/:id', verifyToken, async (req, res) => {
      const id = req.params.id;

      const booking = await myBookingDataCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!booking) {
        return res.status(404).send({ message: 'Booking not found' });
      }

      // already cancelled
      if (!booking.BookingStatus) {
        return res.send({ message: 'Already cancelled' });
      }

      // 1. cancel booking
      await myBookingDataCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: { BookingStatus: false },
        },
      );

      // 2. increase slot
      await tutorsDataCollection.updateOne(
        { _id: new ObjectId(booking.tutorId) },
        { $inc: { slots: 1 } },
      );

      res.send({ message: 'Booking cancelled successfully' });
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Server Is Running Successful!');
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
