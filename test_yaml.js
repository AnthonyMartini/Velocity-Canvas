
const helpers = require('./frontend/src/RendererPage/helpers.jsx');

// Mock data to test YAML generation
const testNode = {
    type: 'Container',
    name: 'TestContainer',
    X: 10,
    Y: 20,
    Width: 320,
    Height: 200,
    Fill: '#ffffff',
    BorderStyle: 'BorderStyle.Solid',
    BorderColor: '#000000',
    BorderThickness: 2,
    RadiusTopLeft: 10,
    RadiusTopRight: 10,
    RadiusBottomLeft: 0,
    RadiusBottomRight: 0,
    DropShadow: 'DropShadow.Medium',
    children: [
        {
            type: 'Button',
            name: 'TestButton',
            Text: '"Click Me"',
            X: 50,
            Y: 50,
            Width: 100,
            Height: 40,
            RadiusTopLeft: 5,
            RadiusTopRight: 5,
            RadiusBottomLeft: 5,
            RadiusBottomRight: 5
        }
    ]
};

try {
    const yaml = helpers.componentToYaml(testNode);
    console.log(yaml);
} catch (e) {
    console.error(e);
}
