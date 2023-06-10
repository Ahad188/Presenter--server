const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_KEY)
const port = process.env.PORT || 5000;

// middleWare
app.use(cors())
app.use(express.json())

// verify jwt function
const verifyJWT = (req, res, next) => {
     const authorization = req.headers.authorization;
     if (!authorization) {
       return res.status(401).send({ error: true, message: 'unauthorized access' });
     }
     // bearer token
     const token = authorization.split(' ')[1];
   
     jwt.verify(token, process.env.Access_Token, (err, decoded) => {
       if (err) {
         return res.status(401).send({ error: true, message: 'unauthorized access' })
       }
       req.decoded = decoded;
       next();
     })
   }


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ejfmzqt.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const usersCollection = client.db('SummarDB').collection('users')
    const classCollection = client.db('SummarDB').collection('classes')
    const teachersCollection = client.db('SummarDB').collection('teachers')
    const myclassCollection = client.db('SummarDB').collection('my-class')
    const paymentsCollection = client.db('SummarDB').collection('payments')

//     JWT API
    app.post('/jwt', (req,res)=>{
     const user = req.body;
     const token = jwt.sign(user, process.env.Access_TOKEN, { expiresIn: '1h' })
     res.send({token})
})
// verifyAdmin middle ware
     const verifyAdmin = async(req,res,next)=>{
          const email = req.decoded.email;
          const query = {email : email}
          const user = await usersCollection.findOne(query)
          if(user.role !== 'admin'){
             return  res.status(403).send({error:true, message: "Forbidden message"})
          }
          next();
     }

//     user api
     app.get('/users',verifyJWT,verifyAdmin, async(req,res)=>{
          const result = await usersCollection.find().toArray()
          res.send(result)
     })

     app.post('/users', async(req,res)=>{
          const user = req.body;
          const query = {email : user.email}
          const existingUser = await usersCollection.findOne(query)
          if(existingUser){
               return res.send({message:"User already exists"})
          }
          const result = await usersCollection.insertOne(user)
          res.send(result);
     })
     app.get('/users/admin/:email',verifyJWT, async(req,res)=>{
          const email = req.params.email;

          if(req.decoded.email !== email){
               res.send({admin : false})
          }

          const query = {email : email};
          const user = await usersCollection.findOne(query);
          const result = {admin : user?.role === 'admin'}
          res.send(result)
     })
   


     app.patch('/users/admin/:id', async(req,res)=>{
          const id = req.params.id;
          const filter = {_id : new ObjectId(id)};
          const updateDoc = {
               $set:{role : "admin"}
          }
          const result = await usersCollection.updateOne(filter,updateDoc)
          res.send(result);
     })
     // app.delete('/users/:id', verifyJWT,verifyAdmin, async(req,res)=>{
     //      const id = req.params.id;
     //      const query = {_id: new ObjectId(id)}
     //      const result = await usersCollection.deleteOne(query)
     //      res.send(result)
     // })





//     get all class here
    app.get('/classes',async (req,res)=>{
     const result = await classCollection.find().toArray()
     res.send(result)
    })
    app.post('/classes',verifyJWT,verifyAdmin, async(req,res)=>{
     const newClass = req.body;
     const result = await classCollection.insertOne(newClass)
     res.send(result)
    })
    app.delete('/classes/:id',verifyJWT,verifyAdmin, async(req,res)=>{
     const id = req.params.id;
     const query = {_id : new ObjectId(id)}
     const result = await classCollection.deleteOne(query)
     res.send(result)
    })

// my-class api create
app.get('/my-class', verifyJWT, async(req,res)=>{
     const email = req.query.email;
     if(!email){
          return res.send([])
     }
     // compare decoded email = email;
     const decodedEmail = req.decoded.email;
     if (email !== decodedEmail) {
          return res.status(403).send({ error: true, message: 'Forbidden access' })
     }

     const query = {email : email};
     const result = await myclassCollection.find(query).toArray()
     res.send(result)
})
app.post('/my-class',async(req,res)=>{
     const item = req.body;
     const result = await myclassCollection.insertOne(item)
     res.send(result);
})
app.delete('/my-class/:id',verifyJWT,verifyAdmin, async(req,res)=>{
     const id = req.params.id;
     const query = {_id : new ObjectId(id)};
     const result = await myclassCollection.deleteOne(query);
     // console.log(result);
     res.send(result)
})


//  get all teacher here
    app.get('/teachers', async(req,res)=>{
     const result = await teachersCollection.find().toArray()
     res.send(result)
    })
    app.post('/teachers', async(req,res)=>{
          const newTeacher = req.body;
          const result = await teachersCollection.insertOne(newTeacher)
          res.send(result)
    })
    app.delete('/teachers/:id',verifyJWT,verifyAdmin, async(req,res)=>{
          const id = req.params.id;
          const query= {_id : new ObjectId(id)}
          const result = await teachersCollection.deleteOne(query)
          res.send(result)
    })


    // create payment intent
    app.post('/create-payment-intent',verifyJWT, async (req, res) => {
     const { price } = req.body;
     const amount = parseInt(price * 100);
     const paymentIntent = await stripe.paymentIntents.create({
       amount: amount,
       currency: 'usd',
       payment_method_types: ['card']
     });

     res.send({
       clientSecret: paymentIntent.client_secret
     })
   })


// payment post api 
app.post('/payments', async(req,res)=>{
     const payment = req.body;
      const insertResult = await paymentsCollection.insertOne(payment);

      const query = { _id: { $in: payment.cartItems.map(id => new ObjectId(id)) } }
      const deleteResult = await myclassCollection.deleteMany(query)

      res.send({insertResult, deleteResult})
})








    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
//     await client.close();
  }
}
run().catch(console.dir);




















app.get('/', (req,res)=>{
     res.send(' Are you ready to  Presenter in this vacation ')
})
app.listen(port,()=>{
     console.log(`Presenter : ${port}`);
})