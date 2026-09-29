# Padel Pixel Cup

A small browser based doubles Padel game made with Three.js. Play as Juno with Mika as your computer controlled partner against Ace and Rio.

## GitHub Pages

The repository includes a workflow that builds and publishes the game when `main` is pushed. The intended public address is [simplybenuk.github.io/padel-pixel-cup](https://simplybenuk.github.io/padel-pixel-cup/). GitHub Pages must use **GitHub Actions** as its publishing source.

## Run

```bash
npm install
npm run dev
```

Open the local address printed by Vite. Run `npm run build` to make a production build in `dist/`.

## Play from another device on the same LAN

Run these commands on a computer connected to that LAN:

```bash
npm install
npm run build
npm run serve:lan
```

On another device, open `http://<that-computer's-LAN-IP>:5173/`. Keep the server running while playing. If it does not connect, allow inbound TCP port 5173 in that computer's firewall. A private Docker address such as `172.22.0.2` is reachable only inside its Docker network unless the host publishes the port.

### If the game is on a remote server you SSH into

If your server runs the game in Docker at `172.22.0.2:5173`, first check that the SSH host can reach it:

```bash
ssh YOUR_SSH_DESTINATION 'curl -I http://172.22.0.2:5173/'
```

If that returns `HTTP/1.1 200 OK`, keep this command running on your computer:

```bash
ssh -N -g -o ExitOnForwardFailure=yes -L YOUR_COMPUTER_LAN_IP:5173:172.22.0.2:5173 YOUR_SSH_DESTINATION
```

Devices on your LAN can then open `http://YOUR_COMPUTER_LAN_IP:5173/`. Replace `YOUR_SSH_DESTINATION` with the same server name or address you normally use with `ssh`. Use your computer's private LAN address, such as a `192.168.x.x` or `10.x.x.x` address. Keep the SSH command running while playing. The Docker address can change after a container restart.

## Controls

| Key | Action |
| --- | --- |
| Arrow keys | Move Juno on your side of the court |
| Space | Serve, or release near the ball to hit it |
| Hold Space, then release | Charge a faster power shot |

The ball may bounce once on your side. Court walls are in play after the bounce. A ball that hits a wall before landing, hits the net, lands on the hitter's side, or bounces twice loses the point. The first team to win three games takes the match.
