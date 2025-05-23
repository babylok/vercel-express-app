import express from 'express';  


const router = express.Router();

router.get('/testing', (req, res) => {
    res.send('Testing route');
});

export default router;  
