# React + TypeScript + Vite 

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

While this project uses React, Vite supports many popular JS frameworks. [See all the supported frameworks](https://vitejs.dev/guide/#scaffolding-your-first-vite-project).

## Deploy Your Own

Deploy your own Vite project with Vercel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel/examples/tree/main/framework-boilerplates/vite-react&template=vite-react)

_Live Example: https://vite-react-example.vercel.app_

### Deploying From Your Terminal

You can deploy your new Vite project with a single command from your terminal using [Vercel CLI](https://vercel.com/download):

```shell
$ vercel
```

## Demo posts

To preview the sample posts included in [`src/lib/placeholders.ts`](src/lib/placeholders.ts) after deploying to Vercel:

1. In your Vercel dashboard, open **Project Settings → Environment Variables** and add `VITE_DEMO` with a value of `1`.
2. Redeploy the project.

When `VITE_DEMO=1` is set, the app displays the placeholder posts defined in `src/lib/placeholders.ts`.
