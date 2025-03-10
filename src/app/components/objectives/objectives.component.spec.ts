import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore } from '@ngrx/store/testing';
import { Subject } from 'rxjs';

import { DispatchTest, ItemId, Mocks, RecipeId, TestModule } from 'src/tests';
import { AppSharedModule } from '~/app-shared.module';
import { MatrixResultType, ObjectiveType, ObjectiveUnit } from '~/models';
import { LabState, Objectives, Preferences, Settings } from '~/store';
import { ObjectivesComponent } from './objectives.component';

describe('ObjectivesComponent', () => {
  let component: ObjectivesComponent;
  let fixture: ComponentFixture<ObjectivesComponent>;
  let mockStore: MockStore<LabState>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ObjectivesComponent],
      imports: [AppSharedModule, TestModule],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ObjectivesComponent);
    mockStore = TestBed.inject(MockStore);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getMessages', () => {
    it('should return no errors unless simplex failed', () => {
      const result = component.getMessages(
        [],
        {
          steps: [],
          resultType: MatrixResultType.Skipped,
        },
        Mocks.ItemsStateInitial,
        Mocks.RecipesStateInitial,
      );
      expect(result.length).toEqual(0);
    });

    it('should build an error message to display to the user', () => {
      const result = component.getMessages(
        [],
        {
          steps: [],
          resultType: MatrixResultType.Failed,
        },
        Mocks.ItemsStateInitial,
        Mocks.RecipesStateInitial,
      );
      expect(result.length).toEqual(1);
    });

    it('should handle some specific known problems with specific error messages', () => {
      let result = component.getMessages(
        [
          {
            id: '0',
            type: ObjectiveType.Maximize,
            targetId: ItemId.Coal,
            value: '1',
            unit: ObjectiveUnit.Items,
          },
        ],
        {
          steps: [],
          resultType: MatrixResultType.Failed,
          simplexStatus: 'unbounded',
        },
        Mocks.ItemsStateInitial,
        Mocks.RecipesStateInitial,
      );
      expect(result[0].summary).toEqual('objectives.errorUnbounded');
      expect(
        result[0].detail?.startsWith('objectives.errorNoLimits'),
      ).toBeTrue();

      result = component.getMessages(
        [
          {
            id: '0',
            type: ObjectiveType.Maximize,
            targetId: ItemId.Coal,
            value: '1',
            unit: ObjectiveUnit.Items,
          },
          {
            id: '1',
            type: ObjectiveType.Limit,
            targetId: ItemId.Coal,
            value: '1',
            unit: ObjectiveUnit.Items,
          },
        ],
        {
          steps: [],
          resultType: MatrixResultType.Failed,
          simplexStatus: 'unbounded',
        },
        { [ItemId.Coal]: { excluded: true } },
        Mocks.RecipesStateInitial,
      );
      expect(result[0].summary).toEqual('objectives.errorUnbounded');
      expect(
        result[0].detail?.startsWith('objectives.errorMaximizeExcluded'),
      ).toBeTrue();

      result = component.getMessages(
        [
          {
            id: '0',
            type: ObjectiveType.Maximize,
            targetId: RecipeId.Coal,
            value: '1',
            unit: ObjectiveUnit.Machines,
          },
          {
            id: '1',
            type: ObjectiveType.Limit,
            targetId: ItemId.Coal,
            value: '1',
            unit: ObjectiveUnit.Items,
          },
        ],
        {
          steps: [],
          resultType: MatrixResultType.Failed,
          simplexStatus: 'unbounded',
        },
        Mocks.ItemsStateInitial,
        { [RecipeId.Coal]: { excluded: true } },
      );
      expect(result[0].summary).toEqual('objectives.errorUnbounded');
      expect(
        result[0].detail?.startsWith('objectives.errorMaximizeExcluded'),
      ).toBeTrue();
    });

    it('should build generic error messages for each simplex status', () => {
      let result = component.getMessages(
        [],
        {
          steps: [],
          resultType: MatrixResultType.Failed,
          simplexStatus: 'unbounded',
        },
        Mocks.ItemsStateInitial,
        Mocks.RecipesStateInitial,
      );
      expect(result[0].summary).toEqual('objectives.errorUnbounded');
      expect(
        result[0].detail?.startsWith('objectives.errorUnboundedDetail'),
      ).toBeTrue();

      result = component.getMessages(
        [],
        {
          steps: [],
          resultType: MatrixResultType.Failed,
          simplexStatus: 'no_feasible',
        },
        Mocks.ItemsStateInitial,
        Mocks.RecipesStateInitial,
      );
      expect(result[0].summary).toEqual('objectives.errorInfeasible');
    });
  });

  describe('setObjectiveOrder', () => {
    it('should map objectives to ids', () => {
      spyOn(component, 'setOrder');
      component.setObjectiveOrder(Mocks.ObjectivesList);
      expect(component.setOrder).toHaveBeenCalledWith(
        Mocks.ObjectivesList.map((o) => o.id),
      );
    });
  });

  describe('changeUnit', () => {
    const picker = {
      selectId: new Subject<string>(),
      clickOpen: (): void => {},
    };
    picker.clickOpen = (): void => {
      picker.selectId.next('id');
    };

    it('should do nothing if switching to and from machines', () => {
      spyOn(component, 'setUnit');
      component.changeUnit(
        Mocks.Objective5,
        ObjectiveUnit.Machines,
        Mocks.Dataset,
        {} as any,
        {} as any,
      );
      expect(component.setUnit).not.toHaveBeenCalled();
    });

    it('should auto-switch from item to recipe', () => {
      spyOn(component, 'setUnit');
      component.changeUnit(
        Mocks.Objective1,
        ObjectiveUnit.Machines,
        Mocks.Dataset,
        {} as any,
        {} as any,
      );
      expect(component.setUnit).toHaveBeenCalledWith(Mocks.Objective1.id, {
        targetId: RecipeId.AdvancedCircuit,
        unit: ObjectiveUnit.Machines,
      });
    });

    it('should prompt user to switch from item to recipe', () => {
      spyOn(component, 'setUnit');
      component.changeUnit(
        {
          id: '0',
          targetId: ItemId.PetroleumGas,
          value: '1',
          unit: ObjectiveUnit.Items,
          type: ObjectiveType.Output,
        },
        ObjectiveUnit.Machines,
        Mocks.Dataset,
        {} as any,
        picker as any,
      );
      expect(component.setUnit).toHaveBeenCalledWith('0', {
        targetId: 'id',
        unit: ObjectiveUnit.Machines,
      });
    });

    it('should auto-switch from recipe to item', () => {
      spyOn(component, 'setUnit');
      component.changeUnit(
        Mocks.Objective5,
        ObjectiveUnit.Items,
        Mocks.Dataset,
        {} as any,
        {} as any,
      );
      expect(component.setUnit).toHaveBeenCalledWith(Mocks.Objective5.id, {
        targetId: ItemId.PiercingRoundsMagazine,
        unit: ObjectiveUnit.Items,
      });
    });

    it('should prompt user to switch from recipe to item', () => {
      spyOn(component, 'setUnit');
      component.changeUnit(
        {
          id: '0',
          targetId: RecipeId.AdvancedOilProcessing,
          value: '1',
          unit: ObjectiveUnit.Machines,
          type: ObjectiveType.Output,
        },
        ObjectiveUnit.Items,
        Mocks.Dataset,
        picker as any,
        {} as any,
      );
      expect(component.setUnit).toHaveBeenCalledWith('0', {
        targetId: 'id',
        unit: ObjectiveUnit.Items,
      });
    });

    it('should auto-switch between items rate units', () => {
      spyOn(component, 'setUnit');
      component.changeUnit(
        Mocks.Objective1,
        ObjectiveUnit.Belts,
        Mocks.Dataset,
        {} as any,
        {} as any,
      );
      expect(component.setUnit).toHaveBeenCalledWith(Mocks.Objective1.id, {
        targetId: Mocks.Objective1.targetId,
        unit: ObjectiveUnit.Belts,
      });
    });
  });

  describe('addItemObjective', () => {
    it('should use ObjectiveUnit.Items', () => {
      spyOn(component, 'addObjective');
      component.addItemObjective(ItemId.AdvancedCircuit);
      expect(component.addObjective).toHaveBeenCalledWith({
        targetId: ItemId.AdvancedCircuit,
        unit: ObjectiveUnit.Items,
      });
    });
  });

  describe('addRecipeObjective', () => {
    it('should use ObjectiveUnit.Machines', () => {
      spyOn(component, 'addObjective');
      component.addRecipeObjective(RecipeId.AdvancedCircuit);
      expect(component.addObjective).toHaveBeenCalledWith({
        targetId: RecipeId.AdvancedCircuit,
        unit: ObjectiveUnit.Machines,
      });
    });
  });

  it('should dispatch actions', () => {
    const dispatch = new DispatchTest(mockStore, component);
    dispatch.val('removeObjective', Objectives.RemoveAction);
    dispatch.val('setOrder', Objectives.SetOrderAction);
    dispatch.idVal('setTarget', Objectives.SetTargetAction);
    dispatch.idVal('setValue', Objectives.SetValueAction);
    dispatch.idVal('setUnit', Objectives.SetUnitAction);
    dispatch.idVal('setType', Objectives.SetTypeAction);
    dispatch.val('addObjective', Objectives.AddAction);
    dispatch.valPrev('setDisplayRate', Settings.SetDisplayRateAction);
    dispatch.val('setPaused', Preferences.SetPausedAction);
  });
});
