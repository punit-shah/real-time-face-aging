# real-time-face-aging

Face aging in real time on the web.

👦 ➡️ 👴

Final year university project.

The application source code can be found in the `src` directory.

## Dependencies

You will need to have Node.js v10 and Yarn installed to run this application.

The following assumes you use [nvm](https://github.com/nvm-sh/nvm) to manage Node.js versions. If not, skip the first command, but make sure Node.js v10 is installed.

```sh
# install Node.js v10
nvm install

# install Yarn
npm i -g yarn

# install project dependencies
yarn
```

## Running the application

To start the development server, run:

```sh
yarn start
```

When your terminal says `webpack: Compiled successfully.`, the application has finished building.
Visit http://localhost:8080 from your browser to view the application.

## Deploying the application

To deploy the application to Surge, run:

```sh
yarn deploy
```

This will build the application for production to the `build` directory, and then publish it
to `https://real-time-face-aging.surge.sh`.
