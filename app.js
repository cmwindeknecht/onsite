import express from 'express';
import data from './api/measures.js'

// Calling express as a function we create a basic web server
const app = express()

// This is the port where we will run our web server
const port = 8080

// We make our webserver listen to an specific PORT
app.listen(
  port, 
  () => console.log(`app listening at http://localhost:${port}`)
);

app.use(express.json())
app.use('/measures', data);

export default app;



