const express = require('express');
const app = express();
const cors = require('cors')
const port = process.env.PORT || 5000;
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config()
const stripe = require('stripe')(process.env.SECRET_STRIPE)
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@cluster0.x89oq.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
    try {
        await client.connect();
        console.log('connected to db')
        const helmetHut = client.db("helmetHut");
        const allProductsCollection = helmetHut.collection("allProducts");
        const usersCollection = helmetHut.collection("users");
        const ordersCollection = helmetHut.collection("orders");
        const reviewsCollection = helmetHut.collection("reviews");

        // get all products
        app.get('/allProducts', async (req, res) => {
            const query = allProductsCollection.find({})
            const result = await query.toArray();
            res.json(result)
        })
        // get selected product
        app.get('/selectedItem/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await allProductsCollection.findOne(query);
            res.json(result)
        })
        // save user
        app.post('/saveUser', async (req, res) => {
            const user = req.body
            const filter = { email: user.email }
            const updateDoc = { $set: { name: user.name } }
            const option = { upsert: true }
            const result = await usersCollection.updateOne(filter, updateDoc, option);
            res.json(result);
        })
        // save orders
        app.post('/placeOrder', async (req, res) => {
            const order = req.body;
            order.status = 'pending'
            const result = await ordersCollection.insertOne(order);
            res.json(result)
        })
        // get user orders
        app.get('/userOrder/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await ordersCollection.find(query).toArray();
            res.json(result);
        })
        // get all orders
        app.get('/allOrders', async (req, res) => {
            const result = await ordersCollection.find({}).toArray()
            res.json(result)
        })
        // save review to  db
        app.post('/addReview', async (req, res) => {
            const data = req.body
            const result = await reviewsCollection.insertOne(data);
            res.json(result);
        })
        // get reviews
        app.get('/allReviews', async (req, res) => {
            const result = await reviewsCollection.find({}).toArray();
            res.json(result)
        })
        //add product
        app.post('/addProduct', async (req, res) => {
            const product = req.body;
            const result = await allProductsCollection.insertOne(product);
            res.json(result)
        })
        //add admin
        app.post('/makeAdmin', async (req, res) => {
            const email = req.body;
            const filter = { email: email.email }
            const updateUser = {
                $set: { role: 'admin' }
            }
            const result = await usersCollection.updateOne(filter, updateUser)
            res.json(result);

        })
        // check Admin role
        app.get('/checkAdminRole/:email', async (req, res) => {
            const user = req.params.email;
            const query = { email: user }
            const result = await usersCollection.findOne(query)
            let admin = false;
            if (result?.role === 'admin') {
                admin = true;
            }
            res.json({ admin })
        })
        // cancel user order
        app.post('/handleCancel', async (req, res) => {
            const id = req.body
            const filter = { _id: ObjectId(id) }
            const result = await ordersCollection.deleteOne(filter);
            res.json(result)
        })
        // delete product
        app.post('/handleUpdateProduct', async (req, res) => {
            const id = req.body
            const filter = { _id: ObjectId(id) }
            const result = await allProductsCollection.deleteOne(filter)
            res.json(result)
        })
        // update status
        app.post('/handleUpdateOrder', async (req, res) => {
            const data = req.body
            const filter = { _id: ObjectId(data.id) };

            if (data.status === 'delete') {
                const result = await ordersCollection.deleteOne(filter);
                res.json(result);
            } else {
                const updateStatus = {
                    $set: { status: data.status }
                }
                const result = await ordersCollection.updateOne(filter, updateStatus);
                res.json(result);
            }
        })

        // save cart info
        app.post('/saveCart', async (req, res) => {
            const orders = req.body
            console.log(orders.email);
            console.log(orders.orders);
            const filter = { email: orders.email }
            const updateDoc = { $set: { cart: orders.orders } }
            const option = {upsert: true}
            const result = await ordersCollection.updateOne(filter, updateDoc,option);
            res.json(result);
        })
        // get cart details
        app.post('/getCart', async (req, res) => {
            const email = req.body.email;
           console.log(email);
           const filter = { email: email }
           const result = await ordersCollection.findOne(filter)
           console.log(result.cart);
           res.json(result.cart)
        })
        // payment intent
        app.post('/create-payment-intent', async (req, res) => {
            const paymentInfo = req.body;
            const amount = paymentInfo.price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                payment_method_types: ['card'],
            });
            res.json({ clientSecret: paymentIntent.client_secret })
        })

    } finally {

    }
} run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('hello')
})
app.get('/check', (req, res) => {
    res.send('hello')
})
app.listen(port, () => {
    console.log('listening to port', port)
})

