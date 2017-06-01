var path = require('path');

var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
    entry: './src/index.js',
    output: {
        filename: 'app.js',
        path: path.resolve(__dirname, 'build')
    },    
    devtool: 'eval-source-map',
    module: {
        rules: [{
            test: /\.js$/,
            exclude: /node_modules/, 
            loader: 'babel-loader',
            options: {
                presets: ['es2015']
            }
        }, {
            test: /\.css$/,
            use: ExtractTextPlugin.extract({
                use: 'css-loader'
            }) 
        }]
    },
    plugins: [
        new ExtractTextPlugin('styles.css')
    ]
};
