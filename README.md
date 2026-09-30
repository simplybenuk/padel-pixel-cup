# Padel Pixel Cup

A small browser based doubles Padel game made with Three.js. Play as Juno with Mika as your computer controlled partner against Ace and Rio.

## Versions

- [`main`](https://github.com/simplybenuk/padel-pixel-cup/tree/main) holds the original one shot game. Its first commit, [`5aa809a`](https://github.com/simplybenuk/padel-pixel-cup/commit/5aa809a), is a permanent reference to that version.
- [`gameplay-v2`](https://github.com/simplybenuk/padel-pixel-cup/tree/gameplay-v2) holds the improved game and is the current GitHub Pages version.

To play either version locally, switch to its branch, run `npm install`, then `npm run dev`. The two prompts that shaped the versions are recorded below.

## GitHub Pages

The repository uses GitHub Actions to build and publish `gameplay-v2` at [simplybenuk.github.io/padel-pixel-cup](https://simplybenuk.github.io/padel-pixel-cup/). To put the original game online again, run the **Deploy game to GitHub Pages** workflow from `main` in the repository's Actions tab. Run it from `gameplay-v2` to return to the improved game. GitHub Pages has one live address, so each deployment replaces the previous version there.

## Prompts

### Original one shot prompt

> Can you one shot a browser based game of Padel (the tennis like game). Doesn't have to be fancy graphics, I'm thinking Mario tennis (Gameboy colour) your graphics and game play.
>
> Create game in new folder.
>
> I expect to be able to play as a character with 3 other computer based characters, my partner and two opponents. Arrow keys for moving player and space bar for hitting ball. Maybe hold down space for power shot .
>
> Use threejs

### Improvement prompt

> Love it as a first pass. But you can definitely improve the game. Switch up who serves, better graphics and make it more realistic game play but maintain cartoon quality, we're after Nintendo look and feel, not realism.
>
> From playing I find the court a little too small and it difficult to judge whether the ball was high or low.

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
| Down arrow + release Space | Lift a defensive lob |

Juno, Ace, Mika, and Rio take turns serving by game. The same player serves every point of a game, switching service sides each point. Juno serves with Space; computer players serve automatically. Serves go diagonally into the opposite service box, and the receiver must let the serve bounce before returning it. A first serve fault gets a second try.

During rallies, the ball may bounce once on your side. Court walls are in play after that bounce, and a shot may rebound off your own wall before crossing the net. A ball that hits the opponents' wall before landing, hits the net, lands on the hitter's side, or bounces twice loses the point. The first team to win three games takes the match. The ball's shadow shows its current ground position, the orange ring predicts its next bounce, and the dots mark its height.
