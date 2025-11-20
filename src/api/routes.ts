import express from "express";
import walletStore from "../storage/walletStore.js";

const router = express.Router();

// POST /wallets/add
// Accepts either `min_deposit_sol`/`max_deposit_sol` (preferred) or legacy lamports fields.
router.post('/wallets/add', express.json(), (req, res) => {
  const {label, address, enabled = true, min_deposit_sol, max_deposit_sol, min_deposit_lamports, max_deposit_lamports} = req.body || {};
  if (!label || !address) return res.status(400).json({error: 'invalid body - label and address required'});
  // Basic validation: require either sol or lamports min/max
  if ((typeof min_deposit_sol !== 'number' || typeof max_deposit_sol !== 'number') && (typeof min_deposit_lamports !== 'number' || typeof max_deposit_lamports !== 'number')) {
    return res.status(400).json({error: 'provide min/max in SOL (preferred) or lamports (legacy)'});
  }
  const entry: any = {label, address, enabled};
  if (typeof min_deposit_sol === 'number') entry.min_deposit_sol = min_deposit_sol;
  if (typeof max_deposit_sol === 'number') entry.max_deposit_sol = max_deposit_sol;
  if (typeof min_deposit_lamports === 'number') entry.min_deposit_lamports = min_deposit_lamports;
  if (typeof max_deposit_lamports === 'number') entry.max_deposit_lamports = max_deposit_lamports;
  walletStore.addCex(entry);
  res.json({ok: true});
});

// POST /wallets/remove
router.post('/wallets/remove', express.json(), (req, res) => {
  const {address} = req.body || {};
  if (!address) return res.status(400).json({error: 'missing address'});
  walletStore.removeCex(address);
  res.json({ok: true});
});

// GET /wallets/list
router.get('/wallets/list', (req, res) => {
  const list = walletStore.getCexList().map((c: any) => ({label: c.label, address: c.address, enabled: c.enabled}));
  res.json({monitored: list});
});

export default router;
