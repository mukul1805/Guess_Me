const express = require('express');
const pg = require('pg');
const cors = require('cors')

const app = express();
const PORT = 3100;

app.use(express.json());
app.use(cors())

const pool = new pg.Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'game',
    password: 'admin',
    port: 5432
});

//to get data from words table
app.get('/data', async (_req, res) => {
    try {
        const result = await pool.query('SELECT * from words ORDER BY id');
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// to just see admin id-pass
app.get('/admin', async (req, res) => {
    try {
        const result = await pool.query('SELECT * from admin');
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//admin-login
app.post('/admin-login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await pool.query('SELECT * FROM admin WHERE username = $1', [username]);

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const storedPasswordHash = result.rows[0].password;
        if (password !== storedPasswordHash) { return res.status(401).json({ message: 'Invalid credentials' }); }
        res.status(200).json({ message: 'Login successful' });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Internal Server Error');
    }
});

//to insert data
app.post('/data', async (req, res) => {
    try {
        const { word, tabooWords } = req.body;
        const result = await pool.query(
            `INSERT INTO words (word, taboo_words) VALUES ($1, $2) RETURNING *`,
            [word, tabooWords]
        );

        res.status(201).json(result.rows[0]);
        console.log("Data Inserted");
    } catch (error) {
        console.error('Error during inserting data:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//UPDATE

app.put('/data', async (req, res) => {
    try {
        const { word, tabooWords } = req.body;
        //word already exists in database
        const existingWord = await pool.query('SELECT * FROM words WHERE word = $1', [word]);

        if (existingWord.rows.length > 0) {
            // If the word exists, update the taboo_words
            const updatedResult = await pool.query(
                'UPDATE words SET taboo_words = $1 WHERE word = $2 RETURNING *',
                [tabooWords, word]
            );
            res.status(200).json(updatedResult.rows[0]);
            console.log('Data Updated:', updatedResult.rows[0]);
        } else {
            //else create a new record
            const newResult = await pool.query(
                'INSERT INTO words (word, taboo_words) VALUES ($1, $2) RETURNING *',
                [word, tabooWords]
            );
            res.status(201).json(newResult.rows[0]);
            console.log('New Data Inserted:', newResult.rows[0]);
        }
    } catch (error) {
        console.error('Error during updating/inserting data:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


//DELETE
app.delete('/data', async (req, res) => {
    try {
        const { word } = req.body;
        // Check if the word exists in the database
        const existingWord = await pool.query('SELECT * FROM words WHERE word = $1', [word]);

        if (existingWord.rows.length === 0) {
            res.status(404).json({ error: 'Word not found' });
            return;
        }
        // If the word exists, delete the row
        const deletedResult = await pool.query('DELETE FROM words WHERE word = $1 RETURNING *', [word]);
        res.status(200).json(deletedResult.rows[0]);
        console.log('Data Deleted:', deletedResult.rows[0]);
    } catch (error) {
        console.error('Error during deleting data:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});