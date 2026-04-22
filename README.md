## ⚙️ Install

```sh
git clone git@github.com:dusixx/rs-node-battleship.git
cd rs-node-battleship
git checkout dev
npm i
```

### Create `.env`

```sh
cp .env.example .env
```

## 🚀 Running

```sh
# run in production mode
npm start

# run in dev mode
npm run dev
```

http://localhost:3000

Enter `http://localhost:[PORT]` in your browser. You'll find `PORT` in the `.env` file. By default `PORT=3000`. Both servers listen on the same `PORT`.

Keep in mind that the `game bot` isn't very smart. It doesn't hit neighboring cells to kill. But it never hits the same cell twice.

Have fun!

## 🆘 If something goes wrong

to `kill` the node, enter in the `OS` terminal

```sh
# for win32 platforms
taskkill /f /im node.exe

# for *nix platforms
killall -9 node
```
