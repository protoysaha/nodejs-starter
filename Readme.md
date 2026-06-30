# Application — Backend (Node.js + Express + MySQL)


Nodejs Starter is a boilerplate for Node.js web applications built with:

MongoDB - A document-oriented, No-SQL database used to store the application data.
ExpressJS - fast node.js network app framework.
nodeJS - A JavaScript runtime built on Chrome's V8 JavaScript engine
Authentication with jsonwebtoken


This backend serves **two clients**:
- **Frontend (User)  app for end users
- **Admin UI** —  app for admins

## 📁 Folder Structure

```
application/
├── node_modules/
├── public/                        
│
├── src/
│   ├── config/                    
│   │
│   ├── controllers/               
│   │   ├── admin/                 
│   │   ├── auth.controller.js    
│   │   └── user.controller.js     
│   │
│   ├── middlewares/                
│   │
│   ├── models/                     
│   │
│   ├── routes/                     
│   │   ├── admin/                  
│   │   ├── user/
│   │   │   ├── auth.routes.js     
│   │   │   ├── users.routes.js    
│   │   │   └── index.js            
│   │   └── index.js                
│   │
│   ├── services/                  
│   │                               
│   │
│   ├── utils/                      # Helper functions
│   │   ├── asyncHandler.js          
│   │   ├── ApiError.js             
│   │   ├── ApiResponse.js          
│   │   └── deleteFile.js          
│   │
│   ├── validators/                 
│   │
│   ├── constants.js                
│   └── index.js                   
│
├── app.js                          
├── index.js                       
├── .env                             
├── .env.example                     
└── package.json



## ➕ How to Add a New API (going forward)

1. **Model** (if needed) → `src/models/<name>.model.js`
2. **Validator** → `src/validators/<name>.validator.js`
3. **Controller** → `src/controllers/<admin|user>/<name>.controller.js`
4. **Route** → `src/routes/<admin|user>/<name>.routes.js`, then register it in that folder's `index.js`
5. Protect with appropriate middleware (`authMiddleware`, `isAdmin`) in the route file
6. Use `asyncHandler`, `ApiResponse`, `ApiError` for consistency

