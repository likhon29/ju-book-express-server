const express = require("express");
const cors = require("cors");
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  Map,
  ObjectID,
} = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;
const app = express();

// Middleware

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USer}:${process.env.DB_PASSWORD}@cluster0.epizi.mongodb.net/?retryWrites=true&w=majority`;

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
    const productsCollection = client
      .db("JUBookExpress")
      .collection("productsCollection");
    const bookingsCollection = client
      .db("JUBookExpress")
      .collection("bookingsCollection");
    const paymentsCollection = client
      .db("JUBookExpress")
      .collection("bookingsCollection");

    
// Category name show in home
    app.get("/categoryName", async (req, res) => {
      const query = {};
      const result = await productsCollection
        .find(query)
        .project({ category: 1 })
        .toArray();
      const unique = [...new Map(result.map((m) => [m.category, m])).values()];
      console.log(unique);
      res.send(unique);
    });

    // jwt

    
    app.get("/users", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });
    app.get("/users/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "seller" });
    });
    app.get("/users/buyer/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "buyer" });
    });
    app.put("/users/seller/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          status: "Verified",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });



    

    app.get("/category/:category", async (req, res) => {
      const category = req.params.category;
      const query = { category: category };
      const products = await productsCollection.find(query).toArray();
      res.send(products);
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
