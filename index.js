const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const port = process.env.PORT || 5000;
const app = express();

// Middleware

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USer}:${process.env.DB_PASSWORD}@cluster0.epizi.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const categoryCollections = client
      .db("JUBookExpress")
      .collection("categoryCollections");
    const usersCollection = client
      .db("JUBookExpress")
      .collection("usersCollection");

    app.get("/allCategories", async (req, res) => {
      const query = {};
      const result = await categoryCollections.find(query).toArray();
      res.send(result);
    });

    app.get('/allCategories/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const category = await categoryCollections.findOne(query);
        res.send(category);
    })
    app.get("/categoryName", async (req, res) => {
      const query = {};
      const result = await categoryCollections
        .find(query)
        .project({ category_name: 1 })
        .toArray();
      res.send(result);
    });

    app.get('/users', async (req, res) => {
        const query = {};
        const users = await usersCollection.find(query).toArray();
        res.send(users);
    });
      
    app.post('/users', async (req, res) => {
        const user = req.body;
        console.log(user);
        // TODO: make sure you do not enter duplicate user email
        // only insert users if the user doesn't exist in the database
        const result = await usersCollection.insertOne(user);
        res.send(result);
    });
  } finally {
  }
}
run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("JU Book Express on going ....");
});
app.listen(port, () => {
  console.log("Ju Book Express listening on", port);
});
