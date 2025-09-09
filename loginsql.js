const sqlite3=require("sqlite3").verbose();
const db=new sqlite3.Database("log.db")

db.run(`
    CREATE TABLE IF NOT EXISTS user_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(200),
    password VARCHAR(200),
    email VARCHAR(200),
    contact_number INTEGER

    );`
    ,(err)=>{
        if(err){
            console.log(err.message)
        }
       
   


 db.run(`
    CREATE TABLE IF NOT EXISTS user_history
    (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    items VARCHAR(200),
    total_price REAL,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES user_table(id))`,(err)=>{
        if(err){
            console.log(err.message)
        }
        
    })



    db.run(`
        CREATE TABLE IF NOT EXISTS owner_table(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(200),
        email VARCHAR(200),
        password VARCHAR(200))
        `,(err)=>{
            if(err){
                console.log("something",err.message)
            }
            
        })
    db.run(`
        CREATE TABLE IF NOT EXISTS restaurant(
        res_id INTEGER PRIMARY KEY AUTOINCREMENT,
        res_name VRACHAR(200),
        place VARCHAR(200),
        latitude REAL,   -- Added for latitude
        longitude REAL,
        owner_id INTEGER,
         FOREIGN KEY (owner_id) REFERENCES owner_table(id)
         )`,(err)=>{
            if(err){
                console.log(err.message)
            }
            
        })
    
    db.run(`

         CREATE TABLE IF NOT EXISTS items_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        restaurant_id INTEGER,
        name TEXT,
        description text,
        photo Text,
        price REAL,
        FOREIGN KEY (restaurant_id) REFERENCES restaurant(id)
    )`,(err)=>{
            if(err){
                console.log(err.message)
            }
            db.run(`ALTER TABLE items_table ADD COLUMN description text `);
           db.close() 

        })
 })