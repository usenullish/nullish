// Replaces the URL without React Router being notified, i.e. without a navigation:
// no loader runs and the mounted route stays as is. The router keeps its previous
// location until the next navigation.
export const replaceUrlWithoutNavigation = (url: string) => {
  window.history.replaceState(window.history.state, "", url);
};
