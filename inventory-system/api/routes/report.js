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

    router.get('/transactions', authenticate, (req, res) => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '无权限' });
        }
        const { period } = req.query; // 'weekly' 或 'monthly'
        const now = new Date();
        let startDate;

        if (period === 'weekly') {
            startDate = new Date(now.setDate(now.getDate() - 7)).toISOString();
        } else {
            startDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
        }

        db.all(`SELECT t.*, p.name FROM transactions t 
                JOIN products p ON t.product_id = p.id 
                WHERE t.date >= ?`, [startDate], (err, transactions) => {
                    if (err) return res.status(500).json({ success: false, message: '获取数据失败' });
                    res.json({ success: true, transactions });
                });
    });

    return router;
};