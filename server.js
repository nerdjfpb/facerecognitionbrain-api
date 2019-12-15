const express = require('express')
var cors = require('cors')
const bodyParser = require('body-parser')
const bycrypt = require('bcryptjs')
const knex = require('knex')

const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password : 'root',
    database : 'smartbrain'
  }
});

const app = express()

app.use(cors())
app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.json("Welcome to smartbrain app api's")
})

app.post('/signin', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json('incorrect form submission')
  }
  db.select('email', 'hash').from('login')
    .where({ email })
    .then(data => {
      const isValid = bycrypt.compareSync(password, data[0].hash)
      if(isValid) {
        return db.select('*').from('users')
          .where({email})
          .then(user => res.json(user[0]))
          .catch(err => res.status(400).json('unable to get user'))
      }
      else {
        res.json('Wrong password')
      }
    })
    .catch(err => res.status(400).json('wrong credientials'))
})

app.post('/register', (req, res) => {
  const { email, name, password } = req.body
  if (!email || !password || !name) {
    return res.status(400).json('incorrect form submission')
  }
  const hash = bycrypt.hashSync(password)
  db.transaction(trx => {
    trx.insert({
      hash,
      email,
    })
    .into('login')
    .returning('email')
    .then(loginEmail => {
      return trx('users')
        .returning('*')
        .insert({
          email: loginEmail[0],
          name,
          joined: new Date(),
          entries: 0
        })
        .then(user => res.json(user[0]))
    })
    .then(trx.commit)
    .catch(trx.rollback)
  })
  .catch(err => res.status(400).json('unable to register'))

})

app.get('/profile/:id', (req, res) => {
  const { id } = req.params
  return db.select('*').from('users').where({ id })
  .then(user => {
    if(user.length){
      res.json(user[0])
    } else {
      res.status(400).json('no user found')
    }
  })
})

app.put('/image', (req, res) => {
  const { id } = req.body
  return db('users')
  .where({id})
  .increment('entries', 1)
  .returning('entries')
  .then(entries =>res.json(entries[0]))
  .catch(err => res.status(400).json("unable to get entries"))
})

app.listen(4000, () => {
  console.log('app is running on port 4000')
})
