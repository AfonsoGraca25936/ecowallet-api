const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors'); // Permite que o Android aceda

const app = express();
app.use(bodyParser.json({ limit: '50mb' })); // Aumentei o limite para aceitar fotos
app.use(cors());

// --- 1. LIGAR AO MONGODB ---
mongoose.connect("mongodb+srv://aluno25936:Aluno25936@ecowallet.xxdyqc4.mongodb.net/ecowallet?retryWrites=true&w=majority&appName=ecowallet")
    .then(() => console.log("✅ MongoDB Conectado!"))
    .catch(err => {
        console.log("❌ ERRO GRAVE NO MONGO:");
        console.error(err); // Isto vai mostrar o erro real nos logs
    });

// ==========================================   
//    MODELOS (SCHEMAS)
// ==========================================

// 2. Modelo do Utilizador (Novo)   
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    saldo: { type: Number, default: 0 } // <--- ADICIONA ISTO
});
const User = mongoose.model('User', UserSchema);

// 3. Modelo da Despesa
const DespesaSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // <--- ESTA LINHA É FUNDAMENTAL
    userId: String,
    titulo: String,
    valor: Number,
    categoria: String,
    data: String,
    fotoCaminho: String
});
const Despesa = mongoose.model('Despesa', DespesaSchema);

// ==========================================
//    ROTAS (API ENDPOINTS)
// ==========================================

// --- ROTAS DE AUTENTICAÇÃO ---

// Rota para REGISTAR um novo utilizador
app.post('/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Verifica se já existe
        const existingUser = await User.findOne({ username: username });
        if (existingUser) {
            return res.status(400).json({ error: true, message: "Username já existe" });
        }

        const newUser = new User({ username, email, password });
        await newUser.save();
        
        // Retorna o sucesso
        res.json({ error: false, message: "Registo efetuado!", user: newUser });
    } catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});

// Rota para LOGIN
app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Procura o utilizador pela pass e user
        const user = await User.findOne({ username: username, password: password });

        if (user) {
            res.json({ error: false, message: "Login OK", user: user });
        } else {
            res.status(400).json({ error: true, message: "Dados incorretos" });
        }
    } catch (e) {
        res.status(500).json({ error: true, message: "Erro no servidor" });
    }
});

// --- ROTAS DE DESPESAS ---

// GET: Buscar despesas (Pode filtrar por userId se enviares ?userId=...)
app.get('/despesas', async (req, res) => {
    let query = {};
    if (req.query.userId) {
        query.userId = req.query.userId;
    }
    const despesas = await Despesa.find(query);
    res.json(despesas);
});

// POST: Criar nova despesa
app.post('/despesas', async (req, res) => {
    try {
        const novaDespesa = new Despesa(req.body);
        const resultado = await novaDespesa.save();
        res.json(resultado); 
    } catch (e) {
        res.status(500).json({ error: "Erro ao criar despesa" });
    }
});

// DELETE: Apagar despesa
app.delete('/despesas/:id', async (req, res) => {
    try {
        const id = req.params.id;

        // REMOVEMOS A VERIFICAÇÃO "isValid(id)" PORQUE AGORA USAMOS UUIDs
        
        // Tentar apagar diretamente
        const despesaApagada = await Despesa.findByIdAndDelete(id);

        if (!despesaApagada) {
            // Se não encontrou, não faz mal (pode já ter sido apagada)
            // Retornamos 200 ou 404, mas para a app o 404 é tranquilo
            return res.status(404).json({ error: "Despesa não encontrada" });
        }

        console.log(`✅ Despesa ${id} apagada com sucesso.`);
        res.json({ message: "Apagado com sucesso" });

    } catch (e) {
        console.error("❌ ERRO NO DELETE:", e);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

app.put('/users/:id/saldo', async (req, res) => {
    try {
        const id = req.params.id;
        const { saldo } = req.body;

        // Atualiza o saldo na base de dados do MongoDB
        const userAtualizado = await User.findByIdAndUpdate(
            id,
            { saldo: saldo },
            { new: true } // Devolve o utilizador já atualizado
        );

        if (!userAtualizado) {
            return res.status(404).json({ error: "Utilizador não encontrado" });
        }
        
        res.json({ message: "Saldo atualizado", saldo: userAtualizado.saldo });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro ao atualizar saldo" });
    }
});

app.get('/ping', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    console.log('Ping recebido. DB Status: ${dbStatus}');
    res.status(200).send('pong - DB: ${dbStatus}');
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor a correr na porta ${PORT}`);
});