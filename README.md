## 🚀 Install & Run

```sh
# install
git clone git@github.com:dusixx/rs-node-battleship.git
cd rs-node-battleship
git checkout dev
npm i
```

```sh
# run in production mode (both `WebSocket` and `Http` servers)
npm start

# run in dev mode (both `WebSocket` and `Http` servers)
npm run start:dev
```

Enter `http://localhost:[HTTP_PORT]` in your browser.

You'll find `HTTP_PORT` in the `.env` file.

By default `HTTP_PORT=8181`

## ℹ️ Notes

Keep in mind that the `game bot` isn't very smart.

It doesn't hit neighboring cells to kill.

But it never hits the same cell twice.

Have fun!

## 🆘 In case something goes wrong

to `kill` the node, enter in the `OS terminal`

```sh
# for win32 platforms
taskkill /f /im node.exe

# for *nix platforms
killall -9 node
```
