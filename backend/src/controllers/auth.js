import { SESSION_COOKIE, sessionToken } from '../middlewares/auth.js';
import { policies } from '../services/account-policies.js';

export function createAuthController(auth, { secureCookies = false }) {
  const cookie = { httpOnly: true, sameSite: 'strict', secure: secureCookies, path: '/api/v1' };

  return {
    policies(_req, res) { res.json({ policies }); },
    async acceptances(req,res) { res.json({ items:await auth.policyHistory(req.user.id) }); },
    async register(req, res) {
      await auth.register(req.validated.body);
      res.status(204).end();
    },
    async listClosures(req, res) {
      res.json(await auth.listClosures(req.validated.query));
    },
    async status(req, res) {
      res.json({ receipt: await auth.closureReceipt(req.validated.body.id) });
    },
    async approve(req, res) {
      res.json({ receipt: await auth.closureReceipt(req.validated.params.id, true) });
    },
    async recover(req, res) {
      await auth.requestReset(req.validated.body.email);
      res.status(202).json({ accepted: true });
    },
    async reset(req, res) {
      await auth.reset(req.validated.body);
      res.status(204).end();
    },
    async rename(req, res) {
      res.json({ user: await auth.rename(req.user.id, req.validated.body.name) });
    },
    async close(req, res) {
      const receipt = await auth.close(req.user, req.validated.body.password);
      res.clearCookie(SESSION_COOKIE, cookie);
      res.status(201).json({ receipt });
    },
    async login(req, res) {
      const { user, token } = await auth.login(req.validated.body);
      res.cookie(SESSION_COOKIE, token, { ...cookie, maxAge: auth.sessionTtlSeconds * 1000 });
      res.json({ user });
    },

    me(req, res) {
      res.json({ user: req.user });
    },

    async logout(req, res) {
      await auth.logout(sessionToken(req));
      res.clearCookie(SESSION_COOKIE, cookie);
      res.status(204).end();
    },
  };
}
