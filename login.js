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
const NEW_SECRET="forrestaurent" 

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
        origin: ["http://localhost:3001", "http://localhost:3002"],
        credentials: true
    }
});
// In login.js
io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);

    // This is the listener for a restaurant joining its private room.
    socket.on('join_restaurant_room', (restaurantId) => {
        // The toString() is a good safety measure
        socket.join(restaurantId.toString());
        console.log(`Socket ${socket.id} joined room for restaurant ${restaurantId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});
  app.use(cors({
  origin: ['http://localhost:3001','http://localhost:3002' ],
  credentials: true
}));


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
  
  if(!owner || owner.password !== password){
    return res.json("invalid credentail")
  }
  const token =jwt.sign({owner_id:owner.id,email:owner.email},NEW_SECRET,{expiresIn:"30d"})
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
  jwt.verify(token,NEW_SECRET,(err,decoder)=>{
    if(err){
     return res.json({auth:false,message:"invalid token"} )
    }
     if (decoder.owner_id === undefined) {
            return res.status(403).json({ auth: false, message: "Forbidden: Not an owner token." });
        }
      
      req.owner=decoder
      req.owner_id=decoder.owner_id
      next()
       
  })


}

app.delete("/delete/:id",async(req,res)=>{
  const {id}=req.params
  const query=`DELETE FROM owner_table WHERE id='${id}'`
  const deleted=await db.run(query)
  res.send("deleted ")
})

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

app.post("/resname",auth,async(req,res)=>{
try{  
  const {resname,place,latitude,longitude}=req.body
  const owner_id=req.owner_id
  console.log(owner_id)
  const res_slug = slugify(resname);
  const postquery=`INSERT INTO restaurant (res_name,place,latitude,longitude,owner_id,res_slug)
  VALUES("${resname}","${place}","${latitude}","${longitude}","${owner_id}",'${res_slug}')`
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
       res.json({hasrestaurant:true,restaurantId: checking.res_id})
    }else{
      res.json({hasrestaurant:false})
    }
  }catch(err){
     console.log("error in check-res",err)
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


app.get('/getItems', auth, async (req, res) => {
    try {
        const ownerId = req.owner_id;
        const restaurantQuery = `SELECT res_id FROM restaurant WHERE owner_id = ?`;
        const restaurant = await db.get(restaurantQuery, [ownerId]);

        if (restaurant) {
            const itemsQuery = `SELECT * FROM items_table WHERE restaurant_id = ?`;
            const allItems = await db.all(itemsQuery, [restaurant.res_id]);
            res.json(allItems);
        } else {
            res.json([]);
        }

    } catch (err) {
        console.error("Error in /getItems:", err.message);
        res.status(500).json({ error: "An error occurred while fetching items." });
    }
});

// ENDPOINT FOR A USER TO GET ALL RESTAURANTS
app.get('/restaurants', authentication, async (req, res) => {
    try {
        // A simple query to get the most important info for the list view
        const sql = `SELECT res_id, res_name, place, res_slug FROM restaurant`;
        
        // db.all() is used because we expect multiple rows
        const restaurants = await db.all(sql);

        res.json(restaurants);

    } catch (err) {
        res.status(500).json({ error: "Failed to fetch restaurants: " + err.message });
    }
});

app.get('/restaurants/:slug', authentication, async (req, res) => {
    const { slug } = req.params; // Get the ID from the URL

    try {
        const restaurantSql = `SELECT * FROM restaurant WHERE res_slug = ?`;
        const restaurantDetails = await db.get(restaurantSql, [slug]);

        if (!restaurantDetails) {
            return res.status(404).json({ error: "Restaurant not found" });
        }

        const itemsSql = `SELECT * FROM items_table WHERE restaurant_id = ?`;
        const menuItems = await db.all(itemsSql, [restaurantDetails.res_id]);

        res.json({
            details: restaurantDetails,
            menu: menuItems
        });

    } catch (err) {
        res.status(500).json({ error: "Failed to fetch restaurant details: " + err.message });
    }
});


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




app.put('/update-order-status/:order_id', auth, async (req, res) => {
    const { order_id } = req.params;
    const { status } = req.body;

    const sql = `UPDATE live_orders SET status = ? WHERE order_id = ?`;

    try {
        // This part stays the same
        await db.run(sql, [status, order_id]);
        const updatedOrder = await db.get('SELECT * FROM live_orders WHERE order_id = ?', [order_id]);

        // --- THIS IS THE NEW LOGIC ---
        // If the order is now marked as 'completed'
        if (status === 'completed' && updatedOrder) {
            
            // Prepare the data for the user_history table
            const historySql = `
                INSERT INTO user_history (user_id, items, total_price, order_date)
                VALUES (?, ?, ?, ?)
            `;
            
            // Insert the completed order into the history table
            await db.run(historySql, [
                updatedOrder.user_id, 
                updatedOrder.items, 
                updatedOrder.total_price,
                updatedOrder.order_time // Use the original order time
            ]);
            
            console.log(`Order #${order_id} moved to history.`);
        }
        // --- END OF NEW LOGIC ---

        // The real-time update to the user still works perfectly
        io.emit('order_update', updatedOrder); 
        console.log(`Emitted order_update for order: ${order_id}`);
        
        res.json(updatedOrder);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Add this to your main server file (e.g., login.js)

app.get('/live-orders', auth, async (req, res) => {
    try {
        const owner_id = req.owner_id;

        const restaurantQuery = `SELECT res_id FROM restaurant WHERE owner_id = ?`;
        const restaurant = await db.get(restaurantQuery, [owner_id]);

        if (!restaurant) {
            return res.status(404).json({ error: "Restaurant not found for this owner." });
        }
        const restaurant_id = restaurant.res_id;

        // 2. Then, get all orders for that restaurant that are not yet completed
        const ordersQuery = `
             SELECT 
                lo.*, 
                ut.username 
            FROM 
                live_orders AS lo
            JOIN 
                user_table AS ut ON lo.user_id = ut.id
            WHERE 
                lo.restaurant_id = ? AND lo.status != 'completed'
            ORDER BY 
                lo.order_id DESC
        `;
        const orders = await db.all(ordersQuery, [restaurant_id]);
        
        // 3. Send the orders back to the frontend
        res.json(orders);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/completed-orders', auth, async (req, res) => {
    try {
        const owner_id = req.owner_id;

        const restaurantQuery = `SELECT res_id FROM restaurant WHERE owner_id = ?`;
        const restaurant = await db.get(restaurantQuery, [owner_id]);

        if (!restaurant) {
            return res.status(404).json({ error: "Restaurant not found for this owner." });
        }
        const restaurant_id = restaurant.res_id;

        // 2. Then, get all orders for that restaurant that are not yet completed
        const ordersQuery = `
             SELECT 
                lo.*, 
                ut.username 
            FROM 
                live_orders AS lo
            JOIN 
                user_table AS ut ON lo.user_id = ut.id
            WHERE 
                lo.restaurant_id = ? AND lo.status == 'completed'
            ORDER BY 
                lo.order_id DESC
        `;
        const orders = await db.all(ordersQuery, [restaurant_id]);
        
        // 3. Send the orders back to the frontend
        res.json(orders);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/profile',auth,async(req,res)=>{
    const ownerId = req.owner_id;
    
    const pro=`SELECT * FROM owner_table WHERE id="${ownerId}"`
    const profile=await db.all(pro)
    res.json(profile)

  
   
})
app.get("/res-details",auth,async(req,res)=>{
    const ownerId = req.owner_id;
    const gettingres=`SELECT * FROM restaurant WHERE owner_id="${ownerId}"`
    const rest=await db.all(gettingres)
    res.json(rest)
})

//for updated status of order for user

app.get('/my-active-orders', authentication, async (req, res) => {
    try {
        // The 'authentication' middleware gives us the logged-in user's ID
        const user_id = req.user_id;

        const sql = `
            SELECT * FROM live_orders 
            WHERE user_id = ? AND status != 'Completed' 
            ORDER BY order_time DESC
        `;

        const activeOrders = await db.all(sql, [user_id]);

        res.json(activeOrders);

    } catch (err) {
        res.status(500).json({ error: "Failed to fetch active orders: " + err.message });
    }
});


// In your backend server file (e.g., login.js)

app.get('/order/:id', authentication, async (req, res) => {
    try {
        const order_id = req.params.id;
        const user_id = req.user_id;

        // Security check: Make sure the logged-in user is the one who owns this order
        const sql = `SELECT * FROM live_orders WHERE order_id = ? AND user_id = ?`;
        const order = await db.get(sql, [order_id, user_id]);

        if (order) {
            res.json(order);
            console.log(order)
        } else {
            res.status(404).json({ error: "Order not found or you do not have permission to view it." });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});