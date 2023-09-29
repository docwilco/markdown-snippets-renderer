import {
    provideVSCodeDesignSystem,
    vsCodeButton,
    vsCodeDivider,
    vsCodePanels,
    vsCodePanelTab,
    vsCodePanelView,
    Button
} from '@vscode/webview-ui-toolkit';

provideVSCodeDesignSystem().register(
    vsCodeButton(),
    vsCodeDivider(),
    vsCodePanels(),
    vsCodePanelTab(),
    vsCodePanelView()
);

window.addEventListener('load', main);

// Setup listener for messages from the extension
window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.command) {
        case 'showHtml':
            const body = document.getElementsByTagName('body')[0];
            if (!body) {
                console.error('Could not find body elements');
                return;
            }
            body.innerHTML = message.html;
    break;
        default:
            console.error('Unknown message received from extension');
    }
});

function main() {
}
