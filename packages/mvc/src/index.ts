/**
 * @banhmi/mvc — Server-side template rendering for Banhmi applications.
 *
 * Provides `MvcModule.forRoot()` to register a view engine, the `@Render`
 * method decorator to render templates from handler return values, and built-in
 * adapters for `eta` and `edge.js` template engines.
 *
 * @example
 * import { MvcModule, etaEngine, Render } from '@banhmi/mvc'
 *
 * \@Module({ imports: [MvcModule.forRoot({ engine: etaEngine({ viewsDir: './views' }) })] })
 * class AppModule {}
 *
 * \@Controller()
 * class HomeController {
 *   \@Get('/')
 *   \@Render('home')
 *   index() {
 *     return { title: 'Welcome' }
 *   }
 * }
 */

export { type EdgeEngineOptions, edgeEngine } from './engines/edge'
export { type EtaEngineOptions, etaEngine } from './engines/eta'
export { MvcModule } from './mvc.module'
export { RENDER_ENGINE_STATE_KEY, Render } from './render.decorator'
export { VIEW_ENGINE_TOKEN } from './tokens'
export type { MvcOptions, ViewEngine } from './types'
