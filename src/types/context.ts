import { setCookie, getCookie } from "hono/cookie";

export type CustomContext = {
  Variables: {
    cookie: typeof setCookie;
    getCookie: typeof getCookie;
    user: {
      userId: string;
      email: string;
    };
  };
};
