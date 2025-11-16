## 🚀 Install & Run

```sh
git clone git@github.com:dusixx/rs-node-battleship.git
cd rs-node-battleship
git checkout dev
npm i
```

#### Run

```sh
# in production mode (both `Wensocket` and `Http` servers)
npm run start
# in dev mode (both `Wensocket` and `Http` servers)
npm run start:dev
```

Enter `http://localhost:[HTTP_PORT]` in your browser.

You'll find `HTTP_PORT` in the `.env` file.

By default `HTTP_PORT=8181`

## 🆘 In case something goes wrong

to `kill` the node, enter in the `OS terminal`

```sh
# for win32 platforms
taskkill /f /im node.exe
# for *nix platforms
killall -9 node
```
