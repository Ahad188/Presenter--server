const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleWare
app.use(cors())
app.use(express.json())


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
    const classCollection = client.db('SummarDB').collection('classes')
    const teachersCollection = client.db('SummarDB').collection('teachers')
    const myclassCollection = client.db('SummarDB').collection('my-class')

//     get all class here
    app.get('/classes',async (req,res)=>{
     const result = await classCollection.find().toArray()
     res.send(result)
    })

// my-class api create
app.get('/my-class', async(req,res)=>{
     const email = req.query.email;
     if(!email){
          return res.send([])
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

//  get all teacher here
    app.get('/teachers', async(req,res)=>{
     const result = await teachersCollection.find().toArray()
     res.send(result)
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