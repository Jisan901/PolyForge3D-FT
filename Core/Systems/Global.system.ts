import { System } from "@/Core/Systems/System"
import { getComponent, getEntities, getCamera } from '@/Core/Functions';
import { Components } from "@/Core/Types/Components";



export default class GlobalSystem extends System {
  onStart(): void {
    console.log('Global system started');
    
    this.app.engine.setActiveCamera(getCamera())
  }
  
  
  
  onUpdate(): void {
      
  }
  
  
  onDestroy(): void {
      
  }
}