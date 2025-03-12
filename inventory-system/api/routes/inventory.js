const express = require('express');
const jwt = require('jsonwebtoken');

module.exports = (db) => {
    const router = express.Router();

    const authenticate = (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ success: false, message: '未授权' });

        jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
            if (err) return res.status(401).json({ success: false, message: '无效的 token' });
            req.user = decoded;
            next();
        });
    };

    router.get('/products', authenticate, (req, res) => {
        db.all('SELECT * FROM products', [], (err, products) => {
            if (err) return res.status(500).json({ success: false, message: '服务器错误' });
            res.json({ success: true, products });
        });
    });

    router.post('/transaction', authenticate, (req, res) => {
        if (req.user.role !== 'staff' && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '无权限' });
        }
        const { product_id, type, quantity } = req.body;
        const date = new Date().toISOString();

        const updateQuery = type === 'in' ? 
            'UPDATE products SET quantity = quantity + ? WHERE id = ?' :
            'UPDATE products SET quantity = quantity - ? WHERE id = ?';
        
        db.run(updateQuery, [quantity, product_id], function(err) {
            if (err) return res.status(500).json({ success: false, message: '更新库存失败' });

            db.run('INSERT INTO transactions (product_id, type, quantity, date) VALUES (?, ?, ?, ?)',
                [product_id, type, quantity, date], (err) => {
                    if (err) return res.status(500).json({ success: false, message: '记录操作失败' });
                    res.json({ success: true, message: '操作成功' });
                });
        });
    });

    router.post('/product', authenticate, (req, res) => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '无权限' });
        }
        const { name, quantity, price } = req.body;
        db.run('INSERT INTO products (name, quantity, price) VALUES (?, ?, ?)',
            [name, quantity, price], function(err) {
                if (err) return res.status(500).json({ success: false, message: '添加产品失败' });
                res.json({ success: true, message: '产品添加成功' });
            });
    });

    router.put('/product/:id', authenticate, (req, res) => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '无权限' });
        }
        const { name, quantity, price } = req.body;
        db.run('UPDATE products SET name = ?, quantity = ?, price = ? WHERE id = ?',
            [name, quantity, price, req.params.id], function(err) {
                if (err) return res.status(500).json({ success: false, message: '更新产品失败' });
                res.json({ success: true, message: '产品更新成功' });
            });
    });

    router.delete('/product/:id', authenticate, (req, res) => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '无权限' });
        }
        db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
            if (err) return res.status(500).json({ success: false, message: '删除产品失败' });
            res.json({ success: true, message: '产品删除成功' });
        });
    });

    return router;
};