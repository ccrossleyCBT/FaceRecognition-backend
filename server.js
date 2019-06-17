const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const uuid = require('uuid');
const PORT = 3000;
const pg = require('knex')({
    client: 'pg',
    connection: {
        host: '127.0.0.1',
        user: '',
        password: '',
        database: 'smart-brain'
    }
});
const app = express();

app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send(db.users);

});

app.get('/profile/:id', (req, res) => {
    const { id } = req.params;

    pg.select('*').from('users').where({ id })
        .then(user => {
            if (user.length) {
                res.json(user[0]);
            } else {
                res.status(400).json('Not Found')
            }
        })
        .catch(err => res.status(400).json('Error getting user'));
})

app.post('/signin', (req, res) => {
    const { email, password } = req.body;
    pg('login').select('email', 'hash').where('email', '=', email)
        .then(data => {
            console.log(data);
            const isValid = bcrypt.compareSync(password, data[0].hash);
            if (isValid) {
                return pg('users').select('*').where('email', '=', email)
                    .then(user => {
                        console.log(user);
                        res.json(user[0]);
                    })
                    .catch(err => res.status(400).json('unable to get user'));
            }
        })
        .catch(err => res.status(400).json('wrong credentials'));
});

app.post('/register', (req, res) => {
    const { email, name, password } = req.body;
    const id = uuid()
    const hash = bcrypt.hashSync(password, null);

    pg.transaction(trx => {
        trx.insert({
            hash,
            email
        })
            .into('login')
            .then(() => {
                return trx('users')
                    .returning('*')
                    .insert({
                        email,
                        name,
                        joined: new Date()
                    })
                    .then(user => res.json(user[0]))
            })
            .then(trx.commit)
            .catch(trx.rollback);
    })
        .catch(err => res.status(400).json('Unable to register'));

});

app.put('/image', (req, res) => {
    const { id } = req.body;

    pg('users').returning('*').where({ id }).increment('entries', 1)
        .then(user => {
            if (user.length) res.json(user[0]);
            res.status(400).json('User not found');
        });
})

app.listen(PORT, () => {
    console.log(`App is running on port ${PORT}`)
});