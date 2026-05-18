const { MongoClient, ServerApiVersion } = require('mongodb');
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
