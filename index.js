const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express();
const cors = require('cors');
const dotEnv = require('dotenv');
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

async function run() {
  try {
    await client.connect();
    await client.db('admin').command({ ping: 1 });

    const database = client.db('TutorsDataBase');
    const tutorsDataCollection = database.collection('tutorsData');
    const myBookingDataCollection = database.collection('my-booking-data');

    // all api
    app.get('/tutors', async (req, res) => {
      const cursor = tutorsDataCollection.find();
      const result = await cursor.toArray();
      res.send({
        massage: 'successfully tutors data get',
        ok: true,
        tutors: result,
      });
    });

    // all api
    app.get('/tutorsList/:id', async (req, res) => {
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
    app.post('/tutors', async (req, res) => {
      const newTutors = req.body;
      const result = await tutorsDataCollection.insertOne(newTutors);
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

    // My booking Data get api
    app.get('/myBooking', async (req, res) => {
      const cursor = myBookingDataCollection.find();
      const result = await cursor.toArray();
      res.send({
        massage: 'successfully myBooking data get',
        ok: true,
        myBooking: result,
      });
    });

    // single tutors Api
    app.get('/tutors/:id', async (req, res) => {
      const id = req.params.id;
      const tutorsData = await tutorsDataCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(tutorsData);
    });

    // My booking Data get api
    app.get('/myBooking/:id', async (req, res) => {
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
    app.post('/myBooking', async (req, res) => {
      const newBooking = req.body;

      // 1. insert booking
      const bookingResult = await myBookingDataCollection.insertOne(newBooking);

      // 2. tutor id
      const tutorId = newBooking.tutorId;

      if (!tutorId) {
        return res.send({
          acknowledged: true,
          warning: 'Booking saved but tutorId missing',
        });
      }

      // 3. slots decrease
      await tutorsDataCollection.updateOne(
        { _id: new ObjectId(tutorId) },
        { $inc: { slots: -1 } },
      );

      res.send({
        acknowledged: true,
        bookingId: bookingResult.insertedId,
      });
    });

    console.log(
      'Pinged your deployment. You successfully connected to MongoDB',
    );
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
