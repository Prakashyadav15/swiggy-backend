const express=require('express');
const sqlite3=require('sqlite3')
const {open}=require("sqlite");
const path=require("path")
const multer = require('multer');

const cors = require('cors');   //for getting frontend req from port

const jwt=require("jsonwebtoken");
const cookieParser=require("cookie-parser");  //for cookies to store jwt token
const http = require('http');
const { Server } = require("socket.io");
const JWT_SECRET = "mysecretkey";   

const app=express();
app.use(express.static('public'));
const server = http.createServer(app);
const dbpath=path.join(__dirname,"log.db")
let db=null;
const initialise=async()=>{
    try{
        db=await open({
          
            filename:dbpath,
            driver:sqlite3.Database
        })
         server.listen(3000,()=>{
            console.log("server is running http://localhost:3000")
         })
    }
    catch(e){
        console.log(`${e}`)
        process.exit(1)
    }
}
initialise()

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3001",
    credentials:true 
    }
});
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_restaurant_room', (restaurantId) => {
      socket.join(restaurantId);
      console.log(`Socket ${socket.id} joined room for restaurant ${restaurantId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
app.use(express.json())

app.post('/userreg',async(req,res)=>{
  
  const{username,password,email,contact_number}=req.body;
  const checkuser=`SELECT * FROM user_table WHERE username='${username}'`
  const getuser=await db.get(checkuser)
  if (getuser===undefined){
      const selectQuery=`
      INSERT INTO user_table (username,password,email,contact_number)
      VALUES ('${username}','${password}','${email}','${contact_number}')`
      const created=await db.run(selectQuery);
      res.send(created)
  }else{
    alert("username is already exists")
  }

  }
)


app.delete("/userreg/:contact_number",async(req,res)=>{
 const {contact_number}=req.params;
const Dquery=`
DELETE FROM user_table WHERE contact_number="${contact_number}"`
await db.run(Dquery)
res.send("deleted successfully")
})

// for login check
app.use(cookieParser());
app.post("/login",async(req,res)=>{
    const {username,password}=req.body;
    try {
    const query=`
    SELECT * FROM user_table WHERE username='${username}'`
    const user=await db.get(query);
    console.log(user)
    if (!user || user.password !==password){  // if user is not their or user password also not same
       return res.send("invalid credentails")
    }
    const token=jwt.sign({user_id:user.id,username:user.username},JWT_SECRET,{expiresIn:"30d"}); // create jwt token and addes expire time
    console.log(token)
   
    res.json({ message: "Login successful","token":token ,user});
    console.log(message)
    
  }catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

function authentication(req,res,next){
  const authheader=req.headers["authorization"]
  const token =authheader && authheader.split(" ")[1];
  if(!token){
    res.status(401).json({auth:false,message:"missing token"})
  }
   jwt.verify(token,JWT_SECRET,(err ,decoded)=>{
      if(err){
         return res.status(401).json({auth:false,message:"invalid token"})
      }
    req.user=decoded;
    req.user_id=decoded.user_id
    next()
  })
    
}

app.get('/verify',authentication,(req,res)=>{
      return res.status(200).json({auth:true,user:req.user})
})




app.post("/logout",(req,res)=>{
  res.clearCookie("token",{
       httpOnly: true,
       sameSite: 'Lax', // Or 'None' if using cross-site cookies with HTTPS
       
  });
  })


app.post("/history",async(req,res)=>{
  const {id,user_id,items,total_price,order_date}=req.body
  const history=`
  INSERT INTO user_history(id,user_id,items,total_price,order_date)
  VALUES('${id}','${user_id}','${items}','${total_price}','${order_date}')`
  const createdhistory=await db.run(history)
  res.json(createdhistory)

})

app.get("/userhistory",authentication,async(req,res)=>{
 
  const user_id=req.user_id
  const gethistory=`SELECT * FROM user_history WHERE user_id='${user_id}' ORDER BY order_date DESC`
  const userhistory=await db.all(gethistory)
  res.json(userhistory)
})

app.delete("/userhistory/:user_id",async(req,res)=>{
 const {user_id}=req.params;
const Dquery=`
DELETE FROM user_history WHERE user_id="${user_id}"`
await db.run(Dquery)
res.send("deleted successfully")
})

//====owner table==//

// 
// 
// 
// 
app.post("/owner",async(req,res)=>{
  const {name,email,password}=req.body
  const postquery=`
  INSERT INTO owner_table (name,email,password)
  VALUES('${name}','${email}','${password}')`
  const owner=await db.run(postquery)
  res.json(owner)
})

app.post("/ownerlog",async(req,res)=>{
  const {email,password}=req.body
try{
  const ownerquery=`SELECT * FROM owner_table WHERE email='${email}'`
  const owner=await db.get(ownerquery)
  console.log(owner)
  if(!owner || owner.password !== password){
    return res.json("invalid credentail")
  }
  const token =jwt.sign({owner_id:owner.id,email:owner.email},JWT_SECRET,{expiresIn:"30d"})
  console.log(token)
  res.send({message:"login succesful","token":token})
  }catch(err){
     res.json("something went wrong"+err.message)
  }
})

function auth(req,res,next){
  const authHead=req.headers['authorization']
  const token=authHead && authHead.split(' ')[1]
  if(!token){
    return res.json({auth:false,message:"missing token"})
  }
  jwt.verify(token,JWT_SECRET,(err,decoded)=>{
    if(err){
     return res.json({auth:false,message:"invalid token"} )
    }
     console.log("token decoded:",decoded)
      req.owner=decoded
      req.owner_id=decoded.owner_id
      next()
       
  })


}

app.delete("/delete/:res_id",async(req,res)=>{
  const {res_id}=req.params
  const query=`DELETE FROM restaurant WHERE res_id='${res_id}'`
  const deleted=await db.run(query)
  res.send("deleted ")
})

app.post("/resname",auth,async(req,res)=>{
try{  
  const {resname,place,latitude,longitude}=req.body
  const owner_id=req.owner_id
  console.log(owner_id)
  const postquery=`INSERT INTO restaurant (res_name,place,latitude,longitude,owner_id)
  VALUES("${resname}","${place}","${latitude}","${longitude}","${owner_id}")`
  const restaurant=await db.run(postquery)
  res.json(restaurant)
}catch(err){
  console.error("Error in /resname route:", err);

}
})


app.get("/check-res",auth,async(req,res)=>{
  try{
    const owner_id=req.owner_id
    const query=`SELECT res_id FROM restaurant WHERE owner_id=?`
    const checking=await db.get(query,[owner_id]);
    if(checking){
       res.json({hasrestaurant:true})
    }else{
      res.json({hasrestaurant:false})
    }
  }catch(err){
     console.log("error in check-re",err)
  }
})

// === Multer Configuration for File Uploads ===

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'public', 'uploads');
          cb(null, uploadPath); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// === API Endpoint to Add a New Item ===
app.post('/items', auth, upload.single('photo'), async (req, res) => {
    try {
        const { name, price, description } = req.body;
        const owner_id = req.owner_id; // Get owner_id from your 'auth' middleware
        console.log(owner_id)
        // 1. Find the restaurant_id for the logged-in owner
        const restaurantQuery = `SELECT res_id FROM restaurant WHERE owner_id = ?`;
        const restaurant = await db.get(restaurantQuery, [owner_id]);

        if (!restaurant) {
            return res.status(404).json({ error: "Restaurant not found for this owner." });
        }
        const restaurant_id = restaurant.res_id;

        // 2. Check if a file was uploaded
        if (!req.file) {
            return res.status(400).json({ error: 'Photo is required.' });
        }

        // 3. Prepare and insert the new item
        const photoUrl = `/uploads/${req.file.filename}`;
        if (!name || !price) {
            return res.status(400).json({ error: 'Name and price are required.' });
        }

        const sql = `INSERT INTO items_table (name, price, description, photo, restaurant_id) VALUES (?, ?, ?, ?, ?)`;
        const params = [name, price, description, photoUrl, restaurant_id];

        const result = await db.run(sql, params);

        res.status(201).json({
            "message": "success",
            "data": { id: result.lastID, name, price, description, photoUrl }
        });

    } catch (err) {
     res.status(500).json({ "error": err.message });
    }
});


app.get('/getItems',auth,async(req,res)=>{
    try{
    const ownerId=req.owner_id
    const getres=`SELECT res_id FROM restaurant WHERE owner_id='${ownerId}'`
    const getresId=await db.get(getres)
   
    if(getresId){
      const getitem=`SELECT * FROM items_table WHERE restaurant_id='${getresId.res_id}'`
      const getingItem=await db.get(getitem)
      res.json(getingItem)
    }

  }catch(err){
     console.log("something went wrong")
  }
})

// In your backend file, add this new endpoint

// Endpoint for a user to place an order
app.post('/place-order', authentication, async (req, res) => {
    const { restaurant_id, items, total_price } = req.body;
    const user_id = req.user_id;

    const sql = `
        INSERT INTO live_orders (user_id, restaurant_id, items, total_price, status)
        VALUES (?, ?, ?, ?, 'Placed')
    `;
    
    try {
        const result = await db.run(sql, [user_id, restaurant_id, JSON.stringify(items), total_price]);
        const newOrder = {
            order_id: result.lastID,
            user_id,
            restaurant_id,
            items,
            total_price,
            status: 'Placed'
        };

        // --- REAL-TIME MAGIC ---
        // Emit an event to the specific restaurant's "room"
        io.to(restaurant_id).emit('new_order', newOrder);
        console.log(`Emitted new_order to restaurant room: ${restaurant_id}`);

        res.status(201).json(newOrder);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Endpoint for a restaurant to update an order status
app.put('/update-order-status/:order_id', auth, async (req, res) => {
    const { order_id } = req.params;
    const { status } = req.body; // e.g., 'Accepted', 'Preparing', 'Ready'

    const sql = `UPDATE live_orders SET status = ? WHERE order_id = ?`;

    try {
        await db.run(sql, [status, order_id]);

        // Get the updated order details to send to the user
        const updatedOrder = await db.get('SELECT * FROM live_orders WHERE order_id = ?', [order_id]);

        // --- REAL-TIME MAGIC ---
        // We need a way to notify the specific user.
        // For a full app, you would map user_id to socket.id
        // For now, we can broadcast, but targeting the user is better.
        io.emit('order_update', updatedOrder); 
        console.log(`Emitted order_update for order: ${order_id}`);
        
        res.json(updatedOrder);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});