const express = require('express');
const jwt = require('jsonwebtoken');

module.exports = (db) => {
    const router = express.Router();

    router.post('/login', (req, res) => {
        const { username, password } = req.body;
        db.get('SELECT * FROM users WHERE username = ? AND password = ?', 
            [username, password], (err, user) => {
                if (err) return res.status(500).json({ success: false, message: '服务器错误' });
                if (!user) return res.status(401).json({ success: false, message: '用户名或密码错误' });

                const token = jwt.sign(
                    { id: user.id, username: user.username, role: user.role },
                    process.env.JWT_SECRET || 'your-secret-key',
                    { expiresIn: '1h' }
                );
                res.json({ success: true, token, role: user.role });
            });
    });

    return router;
};