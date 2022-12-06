const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_KEY);

const port = process.env.Port || 5000;
const app = express();

//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.BD_USER}:${process.env.BD_PASSWORD}@cluster0.xg2xq3m.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {

        const categoryCollection = client.db('myBooks').collection('category');
        const bookCollection = client.db('myBooks').collection('allBooks');
        const sellerCollection = client.db('myBooks').collection('sellers');
        const orderCollection = client.db('myBooks').collection('orders');
        const paymentsCollection = client.db('myBooks').collection('payments');
        app.get('/category', async (req, res) => {
            const query = {};
            const options = await categoryCollection.find(query).toArray();
            res.send(options);
        });
        app.get('/dashboardCategory', async (req, res) => {
            const query = {};
            const options = await categoryCollection.find(query).project({ name: 1 }).toArray();
            res.send(options);
        });

        app.get('/allbooks', async (req, res) => {
            const query = {};
            const result = await bookCollection.find(query).toArray();
            res.send(result);
        });

        app.get('/allbooks/:category', async (req, res) => {
            let category = req.params.category;
            const query = { category: category };
            const result = await bookCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await sellerCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
                return res.send({ accessToken: token });
            }

            res.status(403).send({ accessToken: '' });
        });

        app.post('/sellers', async (req, res) => {
            const seller = req.body;
            const result = await sellerCollection.insertOne(seller);
            res.send(result);
        });
        app.get('/sellers/seller', async (req, res) => {
            const query = sellerCollection.find({ role: 'Seller' })
            const result = await query.toArray();
            res.send(result);
        })
        app.get('/sellers/buyer', async (req, res) => {
            const query = sellerCollection.find({ role: 'Buyer' })
            const result = await query.toArray();
            res.send(result);
        })



        app.get('/sellers/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const result = await sellerCollection.findOne(query);
            res.send({ isSeller: result?.role === 'Seller' });
        });
        app.get('/sellers/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const result = await sellerCollection.findOne(query);
            res.send({ isBuyer: result?.role === 'Buyer' });
        });
        app.get('/sellers/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const result = await sellerCollection.findOne(query);
            res.send({ isAdmin: result?.role === 'Admin' });
        });

        app.post('/addBooks', async (req, res) => {
            const book = req.body;
            const result = await bookCollection.insertOne(book);
            res.send(result)
        });

        app.post('/addOrder', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result)
        });

        app.get('/books', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const books = await bookCollection.find(query).toArray();
            res.send(books);
        });
        app.get('/orders', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const orders = await orderCollection.find(query).toArray();
            res.send(orders);
        });

        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const order = await orderCollection.findOne(query);
            res.send(order);
        });

        app.post('/create-payment-intent', async (req, res) => {
            const order = req.body;
            const price = order.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.post('/payments', async (req, res) =>{
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.orderId
            const filter = {_id: ObjectId(id)}
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await orderCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        app.delete('/seller/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await sellerCollection.deleteOne(filter);
            res.send(result);
        })
        app.delete('/buyer/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await sellerCollection.deleteOne(filter);
            res.send(result);
        })
        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(filter);
            res.send(result);
        })
        app.delete('/book/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await bookCollection.deleteOne(filter);
            res.send(result);
        })

    }
    finally {

    }
}
run().catch(console.log())


app.get('/', async (req, res) => {
    res.send('Bookshop server is running');
})

app.listen(port, () => console.log(`Books shop server is running on ${port}`))