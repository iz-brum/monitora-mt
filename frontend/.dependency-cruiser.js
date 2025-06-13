/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
    forbidden: [
        {
            name: 'no-circular',
            severity: 'error',
            comment: 'Circular dependency detected',
            from: {},
            to: {
                circular: true
            }
        }
    ],
    options: {
        doNotFollow: {
            path: 'node_modules'
        },
        tsConfig: {
            fileName: 'tsconfig.json'
        }
    }
};
