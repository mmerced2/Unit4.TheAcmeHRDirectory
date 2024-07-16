const express = require('express');
const {Client} = require('pg');
const bodyParser = require('body-parser');

const server = express();
const PORT = process.env.PORT || 3000;

server.use(bodyParser.json());

const client = new Client({
    user: "postgres",
    password: "postgres",
    host: "localhost",
    port: 5432,
    database: "acme_hr_directory",
})

const init = async () => {

    await client.connect();
    console.log('client connected')

    let SQL = `
    DROP TABLE IF EXISTS employees;
    DROP TABLE IF EXISTS departments;

    CREATE TABLE departments(
    id SERIAL PRIMARY KEY, 
    name VARCHAR(255) NOT NULL);
    
    CREATE TABLE employees(
    id SERIAL PRIMARY KEY, 
    name VARCHAR(255) NOT NULL, 
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(), 
    department_id INTEGER REFERENCES departments(id) NOT NULL
    );

    `;

    await client.query(SQL);
    console.log("tables created");

    SQL = `
    INSERT INTO departments(name) VALUES('Corporate Other');
    INSERT INTO departments(name) VALUES('Sales');
    INSERT INTO departments(name) VALUES('Human Resources');
    
    
    INSERT INTO employees(name, department_id) VALUES('Michael Scott', (SELECT id from departments WHERE name='Corporate Other'));
    INSERT INTO employees(name, department_id) VALUES('Dwight Schrute', (SELECT id from departments WHERE name='Sales'));
    INSERT INTO employees(name, department_id) VALUES('Toby Flenderson', (SELECT id from departments WHERE name='Human Resources'));`

    await client.query(SQL);
    console.log("seeded tables");

    ///console log inside listen .
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`)
    })
  ;

}; 

init();

server.use(express.json());
server.use(require("morgan")("dev"));

//returns array of employees
server.get('/api/employees', async (req, res, next) => {
try{
    const SQL = `SELECT * from employees `;
    const response = await client.query(SQL);
    res.send(response.rows);
}
catch(error){
    next(error)
};
});


//returns an array of departments
server.get('/api/departments', async (req, res, next) => {
    try{
        const SQL = `SELECT * from departments `;
        const response = await client.query(SQL);
        res.send(response.rows);

    }
    catch(error){
        next(error)
    };
});


//payload: the employee to create, returns the created employee
server.post('/api/employees', async (req, res, next) => {
    try{
        const {name, department_id}=req.body;
        const SQL = `INSERT INTO employees(name, department_id)
        VALUES ($1, $2) RETURNING *;`
        const response = await client.query(SQL, [name, department_id]);
        res.sendStatus(201).send(response.rows[0]);
    }
    catch(error){
        next(error)
    };
});

//deletes the id of the employee to delete is passed in the URL, returns nothing
server.delete('api/employees/:id', async (req, res, next) => {
    try{
        const SQL = `DELETE FROM employees WHERE id=$1`;
        const response = await client.query(SQL , [req.params.id]);
        res.sendStatus(204).send(response.rows[0]);

    }
    catch(error){
        next(error)
    };
});

//payload: the updated employee returns the updated employee
server.put('api/employees/:id', async (req, res, next) => {
    try{
        const {name, department_id} = req.body;
        const SQL = `UPDATE employees SET name=$1, department_id=$3, updated_at=now()
        WHERE id=$2
        RETURNING *;`
        const response = await client.query(SQL, [name, department_id, req.paramas.id]);
        res.sendStatus(200).send(response.rows[0]);

    }
    catch(error){
        next(error)
    };
});

//error handling route which returns an object with an error property
server.use((err,req,res) => {
    res.status(err.status || 500).send({error: err});
});