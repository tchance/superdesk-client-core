/**
 * @ngdoc directive
 * @module superdesk.apps.desks
 * @name sdDeskConfigModal
 *
 * @requires metadata
 * @requires content
 * @requires api
 *
 * @description Generates modal for editing desks
 */

DeskConfigModal.$inject = ['metadata', 'content', 'templates', 'api'];
export function DeskConfigModal(metadata, content, templates, api) {
    return {
        scope: {
            modalActive: '=active',
            desk: '=',
            step: '=',
            desks: '=',
            cancel: '&'
        },
        require: '^sdDeskConfig',
        templateUrl: 'scripts/apps/desks/views/desk-config-modal.html',
        link: function(scope, elem, attrs, ctrl) {
            /*
             * Initialize metadata
             * @return {Object} metadata
             */
            metadata.initialize().then(() => {
                scope.metadata = metadata.values;
            });

            /*
             * Initialize content types
             * @return {Object} profiles
             */
            content.getTypes().then((profiles) => {
                scope.profiles = profiles;
            });

            /*
             * Initialize languages
             * @return {Object} languages
             */
            api.query('languages').then((languages) => {
                scope.languages = languages._items;
            });

            scope.$watch('desk', (desk) => {
                scope.templates = null;
                if (desk) {
                    templates.fetchTemplatesByDesk(desk._id).then((data) => {
                        scope.templates = data._items;
                    });
                }
            });
        }
    };
}
