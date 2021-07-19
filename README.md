# real-time-face-aging

Face aging in real time on the web.

👦 ➡️ 👴

Final year university project.

The application source code can be found in the `src` directory.

## Dependencies

You will need to have Node.js and Yarn installed on your computer.
You can download them from:

- https://nodejs.org/en/
- https://yarnpkg.com/lang/en/

To install the project dependencies, navigate to this directory from the command line, and run:

```
yarn install
```

## Running the application

To start the development server, run:

```
yarn start
```

When your terminal says `webpack: Compiled successfully.`, the application has finished building.
Visit `http://localhost:8080` from your browser to view the application.

## Deploying the application

To deploy the application to Surge, run:

```
yarn deploy
```

This will build the application for production to the `build` directory, and then publish it
to `https://real-time-face-aging.surge.sh`.
