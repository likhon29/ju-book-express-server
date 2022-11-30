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

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.epizi.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

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
      .collection("paymentsCollection");

    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    const verifySeller = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "seller") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // Category name show in home using project
    app.get("/categoryName", async (req, res) => {
      const query = {};
      const result = await productsCollection
        .find(query)
        .project({ category: 1 })
        .toArray();
      const unique = [...new Map(result.map((m) => [m.category, m])).values()];
      res.send(unique);
    });

    

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
      // const decodedEmail = req.decoded.email;

      // if (email !== decodedEmail) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });

    // jwt

    // Show all buyer for admin
    app.get("/allBuyers", verifyJWT, verifyAdmin, async (req, res) => {
      const role = req.query.role;
      const query = {
        role: role,
      };
      const allBuyers = await usersCollection.find(query).toArray();
      res.send(allBuyers);
    });

    // show all seller for admin
    app.get("/allSellers",  async (req, res) => {
      const role = req.query.role;
      const query = {
        role: role,
      };
      const allSellers = await usersCollection.find(query).toArray();
      res.send(allSellers);
    });

    // my buyer for a seller
    app.get("/myBuyers", async (req, res) => {
      
      const seller_email = req.query.email;
      // const decodedEmail = req.decoded.email;

      // if (email !== decodedEmail) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      const query = {
        seller_email: seller_email,
      };
      const myBuyers = await bookingsCollection.find(query).toArray();
      res.send(myBuyers);
    });
    
    // all orders for a buyer
    app.get("/bookings", verifyJWT,async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = {
        buyerEmail: email,
         
    };
      // console.log(query);
      const booking = await bookingsCollection.find(query).toArray();
      res.send(booking);
    });
    //  a particular bookings for buyer
    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id)
      
      const query = { _id: ObjectId(id) };
      const booking = await bookingsCollection.findOne(query);
      res.send(booking);
    });
    // booking a product for a buyer
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const query = {
        book_id: booking.book_id,
        buyerName: booking.buyerName,
      };
      const alreadyBooked = await bookingsCollection.find(query).toArray();
      if (alreadyBooked.length) {
        const message = `Already  you have booked this book .Please try another one`;
        return res.send({ acknowledged: false, message });
      }
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1h",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const query = {
        // buyerEmail: booking.buyerEmail,
        email: user.email,
      };

      const alreadySaved = await usersCollection.find(query).toArray();

      if (alreadySaved.length) {
        // const message = `You already have booked this book`;
        return res.send({ acknowledged: false });
      }
      // TODO: make sure you do not enter duplicate user email
      // only insert users if the user doesn't exist in the database
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.put("/users/admin/:id", verifyJWT, verifyAdmin,async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });
    app.delete("/users/admin/:id",verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // temporary to update product status field on products collection
    // app.get('/addProductStatus', async (req, res) => {
    //     const filter = {}
    //     const options = { upsert: true }
    //     const updatedDoc = {
    //         $set: {
    //             productStatus: 'available',
    //             isAdvertised: "no",
    //         }
    //     }
    //     const result = await productsCollection.updateMany(filter, updatedDoc, options);
    //     res.send(result);
    // })
    app.get("/products", async (req, res) => {
      // const decodedEmail = req.decoded.email;

      // if (email !== decodedEmail) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      const isAdvertised = req.query.isAdvertised;
      const query = { isAdvertised: isAdvertised };
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });
    app.get("/admin/reportedProducts", async (req, res) => {
      // const decodedEmail = req.decoded.email;

      // if (email !== decodedEmail) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      const isReported = req.query.isReported;
      const query = { isReported: isReported };
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });
    app.delete("/admin/reportedProducts", async (req, res) => {
      // const decodedEmail = req.decoded.email;

      // if (email !== decodedEmail) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      const isReported = req.query.isReported;
      const query = { isReported: isReported };
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });
    app.post("/addProducts", async (req, res) => {
      const product = req.body;
      console.log(product);
      // TODO: make sure you do not enter duplicate user email
      // only insert users if the user doesn't exist in the database
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    app.put("/addToReportedItem/:id", async (req, res) => {
      const id = req.params.id;
      // const decodedEmail = req.decoded.email;

      // if (email !== decodedEmail) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          isReported: "yes",
        },
      };
      const result = await productsCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    app.get("/seller/myProduct/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      // const decodedEmail = req.decoded.email;

      // if (email !== decodedEmail) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }

      const query = { _id: ObjectId(id) };

      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    app.patch("/seller/myProduct/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      // const decodedEmail = req.decoded.email;

      // if (email !== decodedEmail) {
      //     return res.status(403).send({ message: 'forbidden access' });
      // }

      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          // productStatus: 'sold',
          isAdvertised: "yes",
        },
      };
      const result = await productsCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    app.delete('/seller/myProduct/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    })

    app.get("/myProducts", async (req, res) => {
      const email = req.query.email;
      // console.log(email);
      // const decodedEmail = req.decoded.email;

      // if (email !== decodedEmail) {
      //     return res.status(403).send({ message: 'forbidden access' });
      // }

      const query = { seller_email: email };

      const products = await productsCollection.find(query).toArray();
      // console.log(products);
      res.send(products);
    });

    app.delete("/admin/reportedProducts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/v2/category/:id", async (req, res) => {
      const id = req.params.id;
      const query = { cid: id };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    // app.get("/category/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: ObjectId(id) };
    //   const category = await categoryCollections.findOne(query);
    //   res.send(category);
    // });

    // temporary to update status field on user collection
    // app.get('/addStatus', async (req, res) => {
    //     const filter = {role:'seller'}
    //     const options = { upsert: true }
    //     const updatedDoc = {
    //         $set: {
    //             status: 'unverified'
    //         }
    //     }
    //     const result = await usersCollection.updateMany(filter, updatedDoc, options);
    //     res.send(result);
    // })

    app.get("/category/:category",  async (req, res) => {
      
      const category = req.params.category;
      const query = { category: category };
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });

    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      const price = booking.price;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      console.log(payment);
      const query = {
        book_id: payment.book_id,
      };
      const alreadyPaid = await paymentsCollection.find(query).toArray();
      if (alreadyPaid.length) {
        const message = `Already Buy this book by Someone .Please try another one`;
        return res.send({ acknowledged: false, message });
      }
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.bookingId;
      const book_id = payment.book_id;
      const filter = { _id: ObjectId(id) };
      console.log(filter);
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const updatedResult = await bookingsCollection.updateOne(
        filter,
        updatedDoc
      );
      console.log(updatedResult, "res1");
      const filter1 = { _id: ObjectId(book_id) };
      const updatedDoc1 = {
        $set: {
          productStatus: "sold",
          isAdvertised: "no",
        },
      };
      const updatedResult1 = await productsCollection.updateOne(
        filter1,
        updatedDoc1
      );
      console.log(updatedResult1, "res2");
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
